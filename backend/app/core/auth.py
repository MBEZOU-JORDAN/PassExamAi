import logging
from functools import lru_cache
from typing import Optional

from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt

from app.core.config import settings

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=True)


def _decode_supabase_token(token: str) -> dict:
    """
    Décode et vérifie un JWT Supabase localement.
    
    Utilise le SUPABASE_JWT_SECRET (HMAC HS256).
    Vérifie : signature, expiration, audience.
    
    Retourne le payload si valide, lève HTTPException sinon.
    """
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            # Supabase émet les user tokens avec audience "authenticated"
            options={"verify_aud": True},
            audience="authenticated",
        )
        return payload

    except ExpiredSignatureError:
        logger.info("Token expiré reçu")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expiré. Reconnectez-vous.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        logger.warning(f"Token JWT invalide : {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_user_from_token(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> dict:
    """
    Dependency FastAPI — vérifie le token et retourne l'utilisateur.
    
    Usage dans les routes :
        current_user: dict = Depends(get_user_from_token)
    
    Retourne :
        {"user_id": "uuid", "email": "user@example.com", "role": "authenticated"}
    """
    payload = _decode_supabase_token(credentials.credentials)

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sans identifiant utilisateur.",
        )

    return {
        "user_id": user_id,
        "email": payload.get("email", ""),
        "role": payload.get("role", "authenticated"),
    }


# Alias pour rétrocompatibilité avec le reste du codebase
# (tous les fichiers qui importent verify_supabase_jwt continuent de fonctionner)
verify_supabase_jwt = get_user_from_token