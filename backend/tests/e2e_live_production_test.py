import asyncio
import sys
import httpx

# Ensure UTF-8 output on Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

LIVE_BACKEND_URL = "https://railpulse-backend-fv1m.onrender.com"
FRONTEND_ORIGIN = "https://railpulse-01i.pages.dev"


async def run_live_production_audit():
    print("=" * 60)
    print(f"STARTING COMPREHENSIVE E2E AUDIT ON {LIVE_BACKEND_URL}")
    print("=" * 60)

    passed = 0
    total = 0

    async with httpx.AsyncClient(timeout=20.0) as client:
        # Helper check
        async def check(name: str, coro):
            nonlocal passed, total
            total += 1
            print(f"[{total:02d}] Testing {name}...", end=" ", flush=True)
            try:
                await coro()
                print("[PASSED OK]")
                passed += 1
            except Exception as e:
                print(f"[FAILED] -> {e}")

        # 1. Root Endpoint
        async def t1():
            r = await client.get(f"{LIVE_BACKEND_URL}/")
            assert r.status_code == 200
            assert r.json().get("status") == "OK"
        await check("Root / Endpoint", t1)

        # 2. Health Endpoint
        async def t2():
            r = await client.get(f"{LIVE_BACKEND_URL}/api/system/health")
            assert r.status_code == 200
            assert r.json().get("data", {}).get("status") == "HEALTHY"
        await check("System Health /api/system/health", t2)

        # 3. CORS Preflight Check
        async def t3():
            headers = {
                "Origin": FRONTEND_ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            }
            r = await client.options(f"{LIVE_BACKEND_URL}/v1/train/12115/telemetry/report", headers=headers)
            assert r.status_code == 200
            allow_orig = r.headers.get("access-control-allow-origin")
            assert allow_orig == FRONTEND_ORIGIN, f"Expected {FRONTEND_ORIGIN}, got {allow_orig}"
        await check(f"CORS Preflight from {FRONTEND_ORIGIN}", t3)

        # 4. Train 12115 Siddheshwar Express Status & Name Resolution
        async def t4():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/train/12115/status")
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert d.get("train_number") == "12115"
            assert "Siddheshwar" in d.get("train_name", ""), f"Wrong name: {d.get('train_name')}"
            assert d.get("current_station") is not None
        await check("Train 12115 Siddheshwar Superfast Express Live Status", t4)

        # 5. Train 12116 Siddheshwar Express Reverse Direction
        async def t5():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/train/12116/status")
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert d.get("train_number") == "12116"
            assert "Siddheshwar" in d.get("train_name", "")
        await check("Train 12116 Siddheshwar Superfast Express Status", t5)

        # 6. Train 22225 Vande Bharat Express
        async def t6():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/train/22225/status")
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert "Vande Bharat" in d.get("train_name", "")
            assert len(d.get("halts", [])) > 0
        await check("Train 22225 Solapur Vande Bharat Status & Halts", t6)

        # 7. Train 12158 Hutatma Express
        async def t7():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/train/12158/status")
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert "Hutatma" in d.get("train_name", "")
        await check("Train 12158 Hutatma Express Status", t7)

        # 8. Train Schedule Timetable
        async def t8():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/train/22225/schedule")
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert len(d.get("halts", [])) > 0
        await check("Train Schedule Timetable (/v1/train/22225/schedule)", t8)

        # 9. Train Route GeoJSON Coordinates
        async def t9():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/train/22225/route")
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert d.get("type") == "Feature" or "coordinates" in d or "halts" in d
        await check("Train Route Geometry (/v1/train/22225/route)", t9)

        # 10. Train Search
        async def t10():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/trains/search?q=Solapur")
            assert r.status_code == 200
            d = r.json().get("data", [])
            assert len(d) > 0, "No trains returned for Solapur search"
        await check("Search Trains Query (/v1/trains/search?q=Solapur)", t10)

        # 11. Station by Code
        async def t11():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/station/CSMT")
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert d.get("station_code") == "CSMT"
        await check("Station Lookup by Code (/v1/station/CSMT)", t11)

        # 12. Search Stations Query
        async def t12():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/stations/search?q=Pune")
            assert r.status_code == 200
            d = r.json().get("data", [])
            assert len(d) > 0
        await check("Search Stations Query (/v1/stations/search?q=Pune)", t12)

        # 13. Station Live Board (Live Trains at Terminal)
        async def t13():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/stations/NDLS/live?hours=4")
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert d.get("station_code") == "NDLS"
            assert len(d.get("trains", [])) > 0
        await check("Station Live Board (/v1/stations/NDLS/live)", t13)

        # 14. Coach Composition
        async def t14():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/train/22225/coaches")
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert len(d.get("coaches", [])) > 0
        await check("Coach Composition Rake (/v1/train/22225/coaches)", t14)

        # 15. Platform Assignments
        async def t15():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/train/22225/platforms")
            assert r.status_code == 200
            d = r.json().get("data", [])
            assert len(d) > 0
        await check("Platform Information (/v1/train/22225/platforms)", t15)

        # 16. Telescopic Fare Enquiry
        async def t16():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/train/22225/fare?origin=CSMT&dest=SUR&quota=GN")
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert len(d.get("classes", [])) > 0
            dist = d.get("distance_km") or d.get("total_distance_km") or 0
            assert dist > 0, f"Distance must be > 0, got {dist}"
        await check("Telescopic Distance Fare Enquiry (/v1/train/22225/fare)", t16)

        # 17. PNR Status Lookup
        async def t17():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/pnr/4523819076")
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert d.get("pnr") == "4523819076"
            assert len(d.get("passengers", [])) > 0
        await check("PNR Status Lookup (/v1/pnr/4523819076)", t17)

        # 18. Crowd-Sourced Passenger GPS Relay (Zero-PII)
        async def t18():
            report = {
                "latitude": 19.1860,
                "longitude": 72.9757,
                "speed_kmph": 92.0,
                "accuracy_meters": 3.8,
            }
            r = await client.post(f"{LIVE_BACKEND_URL}/v1/train/22225/telemetry/report", json=report)
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert d.get("status") == "relayed"
            assert d.get("location_type") == "GPS_OBSERVED"
            assert d.get("confidence") == "HIGH"
            assert "Zero-PII" in d.get("privacy_notice", "")

            # Verify crowd pulse metadata
            r_meta = await client.get(f"{LIVE_BACKEND_URL}/v1/train/22225/crowd")
            assert r_meta.status_code == 200
            assert r_meta.json().get("data", {}).get("active_reporters") >= 1
        await check("Crowd-Sourced GPS Telemetry Relay & Zero-PII Guarantee", t18)

        # 19. AI Assistant Chat
        async def t19():
            payload = {
                "messages": [
                    {"role": "user", "content": "What is the route of train 12115 Siddheshwar Express?"}
                ],
                "model": "mistralai/mistral-small-2603",
            }
            r = await client.post(f"{LIVE_BACKEND_URL}/api/v1/ai/chat", json=payload)
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert "response" in d
            assert len(d.get("response", "")) > 10
        await check("AI Railway Assistant Chat (/api/v1/ai/chat)", t19)

        # 20. Train 12919 Malwa Express Live Status
        async def t20():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/train/12919/status")
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert d.get("train_number") == "12919"
        await check("Train 12919 Malwa Express Status (/v1/train/12919/status)", t20)

        # 21. Live Station Concourse Board for Pune
        async def t21():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/stations/PUNE/live?hours=2")
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert d.get("station_code") == "PUNE"
            trains = d.get("trains", [])
            assert len(trains) > 0
            # Verify each train has destination and platform info
            assert any(t.get("destination") for t in trains)
        await check("Live Station Concourse Board (/v1/stations/PUNE/live?hours=2)", t21)

        # 22. Network Disruptions Intelligence Summary
        async def t22():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/alerts/disruptions")
            assert r.status_code == 200
            d = r.json().get("data", {})
            assert d.get("total_active_alerts", 0) >= 6
            assert d.get("mega_blocks_count", 0) >= 1
            assert d.get("diverted_trains_count", 0) >= 1
        await check("Disruption Intelligence Summary (/v1/alerts/disruptions)", t22)

        # 23. Corridor Mega Blocks Query
        async def t23():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/alerts/mega-blocks")
            assert r.status_code == 200
            d = r.json().get("data", [])
            assert len(d) >= 1
            assert any("Mega Block" in b.get("title", "") or "Block" in b.get("title", "") for b in d)
        await check("Corridor Mega Blocks Query (/v1/alerts/mega-blocks)", t23)

        # 24. Train-Specific Route Diversions (Train 12115)
        async def t24():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/alerts/train/12115")
            assert r.status_code == 200
            d = r.json().get("data", [])
            assert len(d) >= 1
            assert "12115" in d[0].get("title", "")
            assert d[0].get("diverted_via") is not None
        await check("Train 12115 Route Diversion Alert (/v1/alerts/train/12115)", t24)

        # 25. AI Concourse Intelligence (Pune next 30 mins, where heading, platform)
        async def t25():
            payload = {
                "messages": [
                    {"role": "user", "content": "If a person is at Pune what trains are coming in next 30 min, where heading, and which platform?"}
                ],
                "model": "mistralai/mistral-small-2603",
            }
            r = await client.post(f"{LIVE_BACKEND_URL}/api/v1/ai/chat", json=payload)
            assert r.status_code == 200
            resp_text = r.json().get("data", {}).get("response", "")
            assert "Pune" in resp_text or "Platform" in resp_text
            assert len(resp_text) > 50
        await check("AI Concourse Intelligence Query (/api/v1/ai/chat)", t25)

        # 26. Frontend Cloudflare Pages Concourse Board URL
        async def t26():
            r = await client.get(f"{FRONTEND_ORIGIN}/stations/?code=PUNE")
            assert r.status_code == 200
            assert len(r.content) > 1000
        await check(f"Cloudflare Pages Concourse Board ({FRONTEND_ORIGIN}/stations/?code=PUNE)", t26)

        # 27. Platform Coach Position Metadata
        async def t27():
            r = await client.get(f"{LIVE_BACKEND_URL}/v1/train/12115/coaches")
            assert r.status_code == 200
            d = r.json().get("data", {})
            coaches = d.get("coaches", [])
            assert len(coaches) > 0
            first_coach = coaches[0]
            assert first_coach.get("platform_pole_number") is not None
            assert first_coach.get("distance_from_engine_m") is not None
            assert first_coach.get("nearest_fob") is not None
        await check("Coach Platform Metadata Enrichment (/v1/train/12115/coaches)", t27)

        # 28. AI Platform Coach Locator Query
        async def t28():
            payload = {
                "messages": [
                    {"role": "user", "content": "Where will coach S2 stop on train 12115?"}
                ],
                "model": "mistralai/mistral-small-2603",
            }
            r = await client.post(f"{LIVE_BACKEND_URL}/api/v1/ai/chat", json=payload)
            assert r.status_code == 200
            resp_text = r.json().get("data", {}).get("response", "")
            assert "S2" in resp_text
            assert "Pole" in resp_text or "Platform" in resp_text
        await check("AI Platform Coach Locator Query (/api/v1/ai/chat)", t28)

        # 29. Cloudflare Pages PWA Web App Manifest
        async def t29():
            r = await client.get(f"{FRONTEND_ORIGIN}/manifest.json")
            assert r.status_code == 200
            d = r.json()
            assert d.get("short_name") == "RailPulse"
            assert d.get("display") == "standalone"
        await check(f"Cloudflare Pages PWA Manifest ({FRONTEND_ORIGIN}/manifest.json)", t29)

        # 30. Cloudflare Pages Offline Service Worker
        async def t30():
            r = await client.get(f"{FRONTEND_ORIGIN}/sw.js")
            assert r.status_code == 200
            assert "railpulse-v1" in r.text
        await check(f"Cloudflare Pages Service Worker ({FRONTEND_ORIGIN}/sw.js)", t30)

    print("=" * 60)
    print(f"AUDIT COMPLETE: {passed}/{total} CHECKS PASSED ({(passed/total)*100:.1f}%)")
    print("=" * 60)
    if passed != total:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_live_production_audit())
