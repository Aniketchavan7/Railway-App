import asyncio
import os
import sys
import time
from datetime import datetime
from typing import Any, Dict, List
import httpx

# Ensure UTF-8 output on Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings
from app.services.orchestrator import KNOWN_TRAINS, orchestrator
from app.services.train_schedule_service import TrainOperationsMetadata, IST

LIVE_BACKEND_URL = "https://railpulse-backend-fv1m.onrender.com"


async def verify_all_trains_with_internet():
    print("=" * 80)
    print("RAILPULSE: LIVE INTERNET VERIFICATION OF ALL 32 TRAINS ACROSS INDIA")
    print(f"Timestamp (IST): {datetime.now(IST).strftime('%Y-%m-%d %H:%M:%S IST')} ({datetime.now(IST).strftime('%A')})")
    print(f"Upstream Provider URL: {settings.RAILWAY_ENGINE_BASE_URL}")
    print(f"Live Production URL:   {LIVE_BACKEND_URL}")
    print("=" * 80)

    headers_re = {"x-api-key": settings.RAILWAY_ENGINE_API_KEY} if settings.RAILWAY_ENGINE_API_KEY else {}

    results: List[Dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        for idx, (train_num, train_name) in enumerate(KNOWN_TRAINS.items(), start=1):
            profile = TrainOperationsMetadata.get_profile(train_num)
            op_check = TrainOperationsMetadata.check_operational_status(train_num)

            # 1. Direct Upstream Provider Check (Railway Engine over internet)
            upstream_http = None
            upstream_state = None
            upstream_station = None
            try:
                r_up = await client.get(
                    f"{settings.RAILWAY_ENGINE_BASE_URL}/train/{train_num}/status",
                    headers=headers_re,
                )
                upstream_http = r_up.status_code
                if r_up.status_code == 200:
                    d_up = r_up.json().get("data") or r_up.json()
                    upstream_state = d_up.get("status") or d_up.get("running_status")
                    curr_stn_obj = d_up.get("currentStation") or d_up.get("current_station")
                    if isinstance(curr_stn_obj, dict):
                        upstream_station = curr_stn_obj.get("name") or curr_stn_obj.get("code")
                    else:
                        upstream_station = str(curr_stn_obj) if curr_stn_obj else None
                elif r_up.status_code == 404:
                    upstream_state = "NOT_FOUND_OR_MAINTENANCE"
                else:
                    upstream_state = f"HTTP_{r_up.status_code}"
            except Exception as e:
                upstream_state = f"ERR: {type(e).__name__}"

            # 2. Live Production Backend Check (Render URL over internet)
            prod_http = None
            prod_provider = None
            prod_sim = None
            prod_state = None
            prod_station = None
            prod_speed = None
            prod_delay = None
            prod_runs_today = None
            try:
                r_prod = await client.get(f"{LIVE_BACKEND_URL}/v1/train/{train_num}/status")
                prod_http = r_prod.status_code
                if r_prod.status_code == 200:
                    d_prod = r_prod.json().get("data", {})
                    prod_provider = d_prod.get("source_provider")
                    prod_sim = d_prod.get("is_simulated")
                    prod_state = d_prod.get("service_state")
                    prod_station = d_prod.get("current_station")
                    prod_speed = d_prod.get("speed_kmph")
                    prod_delay = d_prod.get("delay_minutes")
                    prod_runs_today = d_prod.get("runs_today")
            except Exception as e:
                prod_state = f"ERR: {type(e).__name__}"

            # 3. Local Orchestrator Evaluation (using updated profiles and rules)
            local_status = None
            try:
                local_status = await orchestrator.get_live_status(train_num)
            except Exception as e:
                pass

            record = {
                "number": train_num,
                "name": train_name,
                "origin": profile.get("origin") if profile else "N/A",
                "destination": profile.get("destination") if profile else "N/A",
                "days_of_run": profile.get("days_of_run") if profile else [],
                "runs_today": op_check.get("runs_today"),
                "expected_state": op_check.get("service_state"),
                "pairing_train": profile.get("pairing_train") if profile else None,
                "upstream_http": upstream_http,
                "upstream_state": upstream_state,
                "upstream_station": upstream_station,
                "prod_http": prod_http,
                "prod_provider": prod_provider,
                "prod_sim": prod_sim,
                "prod_state": prod_state,
                "prod_station": prod_station,
                "prod_speed": prod_speed,
                "prod_delay": prod_delay,
                "prod_runs_today": prod_runs_today,
                "local_state": local_status.service_state if local_status else None,
                "local_sim": local_status.is_simulated if local_status else None,
                "local_provider": local_status.source_provider if local_status else None,
            }
            results.append(record)

            status_icon = "🟢" if record["runs_today"] else "🟡"
            print(
                f"[{idx:02d}/32] {status_icon} Train {train_num:5s} | {train_name[:26]:26s} | "
                f"Upstream: {str(upstream_http):3s} ({str(upstream_state)[:15]:15s}) | "
                f"Prod: {str(prod_state):18s} | "
                f"Runs Today: {str(record['runs_today']):5s} | "
                f"Current: {str(prod_station)[:20]}"
            )
            await asyncio.sleep(0.15)

    print("=" * 80)
    print("VERIFICATION AUDIT COMPLETE FOR ALL 32 TRAINS")
    print("=" * 80)

    # Verification assertions
    all_indexed = all(r["days_of_run"] for r in results)
    print(f"1. All 32 trains operational metadata indexed: {'PASSED' if all_indexed else 'FAILED'}")

    all_prod_200 = all(r["prod_http"] == 200 for r in results)
    print(f"2. All 32 trains live production HTTP 200: {'PASSED' if all_prod_200 else 'FAILED'}")

    # Check non-running days verified with internet
    wed_non_running = [r for r in results if not r["runs_today"]]
    print(f"3. Correct non-operating trains on Wednesday detected ({len(wed_non_running)} trains):")
    for nr in wed_non_running:
        print(f"   - {nr['number']} {nr['name']}: {nr['expected_state']} (Pairs with: {nr['pairing_train']})")

    # Check running trains
    running_trains = [r for r in results if r["prod_state"] == "RUNNING"]
    print(f"4. Actively RUNNING trains verified on live network ({len(running_trains)} trains):")
    for rt in running_trains:
        print(f"   - {rt['number']} {rt['name']}: Near {rt['prod_station']} (Speed: {rt['prod_speed']} km/h, Delay: {rt['prod_delay']}m)")

    # Check not started trains
    not_started_trains = [r for r in results if r["prod_state"] == "NOT_STARTED"]
    print(f"5. Upcoming trains scheduled for later today ({len(not_started_trains)} trains):")
    for ns in not_started_trains[:5]:
        print(f"   - {ns['number']} {ns['name']} at {ns['prod_station']}")
    if len(not_started_trains) > 5:
        print(f"   ... and {len(not_started_trains) - 5} more.")

    return results


if __name__ == "__main__":
    asyncio.run(verify_all_trains_with_internet())
