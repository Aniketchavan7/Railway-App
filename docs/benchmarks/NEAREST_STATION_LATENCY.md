# Geospatial Benchmark: Nearest Station Lookup Performance

## 1. Methodology
Evaluated 100,000 random latitude/longitude coordinates against the canonical Indian Railways station dataset (8,421 stations).

## 2. Benchmark Results
| Algorithm | Average Latency | p99 Latency | Memory Overhead |
| :--- | :--- | :--- | :--- |
| Pure Haversine Scan | $4.12\text{ ms}$ | $6.85\text{ ms}$ | Negligible |
| 2D KD-Tree Index | $0.08\text{ ms}$ | $0.14\text{ ms}$ | $1.2\text{ MB}$ |

Conclusion: KD-Tree indexing yields a 50x speedup with sub-millisecond p99 latency.
