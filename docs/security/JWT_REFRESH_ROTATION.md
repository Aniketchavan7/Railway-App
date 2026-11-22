# Security Specification: OAuth2 Refresh Token Family Rotation

## 1. Replay Prevention
When a previously used refresh token is presented, the entire descendant token family is immediately revoked.
