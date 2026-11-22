# Telemetry Smoothing Architecture: Kalman Filter Specification

## 1. Overview
Onboard railway GPS sensors frequently encounter multipath interference, tunnel dropouts, and satellite occlusion. This specification outlines the linear Kalman filtering pipeline implemented in `backend/app/telemetry/smoothing.py` to guarantee fluid real-time train positioning.

## 2. State Vector & Transition Matrix
The state of train $k$ at time step $t$ is modeled as a 4-dimensional state vector combining 2D geospatial coordinates and velocity vectors:

$$\mathbf{x}_t = \begin{bmatrix} lat_t \\ lon_t \\ v_{lat, t} \\ v_{lon, t} \end{bmatrix}$$

State propagation across interval $\Delta t$:

$$\mathbf{x}_t = \mathbf{F} \mathbf{x}_{t-1} + \mathbf{w}_t, \quad \mathbf{F} = \begin{bmatrix} 1 & 0 & \Delta t & 0 \\ 0 & 1 & 0 & \Delta t \\ 0 & 0 & 1 & 0 \\ 0 & 0 & 0 & 1 \end{bmatrix}$$

## 3. Outlier Rejection Thresholds
Incoming raw GPS pings exceeding $200\text{ km/h}$ acceleration or Euclidean step distances $> 1.5\text{ km}$ within $3\text{ seconds}$ are flagged as telemetry corruption, discarded from the measurement update, and estimated via state extrapolation.
