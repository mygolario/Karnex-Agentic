import base64
import hashlib
import os

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


class TokenEncryption:
    """
    AES-256-CBC encryption for OAuth tokens.
    Key source: settings.ENCRYPTION_KEY (32 bytes UTF-8).
    Never use SUPABASE_JWT_SECRET — that key serves JWT verification only.
    IV is randomly generated per encryption and prepended to ciphertext.
    Output is base64url-encoded for safe database storage.
    """

    def __init__(self, key: str):
        if not key:
            raise ValueError("Encryption key cannot be empty")
        # Derive 32-byte key using scrypt to match Node.js implementation exactly
        self.key = hashlib.scrypt(
            key.encode("utf-8"), salt=b"karnex-salt", n=16384, r=8, p=1, dklen=32
        )

    def encrypt(self, plaintext: str) -> str:
        if not plaintext:
            return ""
        # Generate random 16-byte IV
        iv = os.urandom(16)
        # Apply PKCS7 padding
        pad_len = 16 - (len(plaintext) % 16)
        padded = plaintext.encode("utf-8") + bytes([pad_len] * pad_len)

        cipher = Cipher(algorithms.AES(self.key), modes.CBC(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(padded) + encryptor.finalize()

        # Prepend IV and base64url encode
        raw = iv + ciphertext
        return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")

    def decrypt(self, ciphertext_b64: str) -> str:
        if not ciphertext_b64:
            return ""
        try:
            # Base64url decode with padding correction
            rem = len(ciphertext_b64) % 4
            padded_b64 = ciphertext_b64
            if rem > 0:
                padded_b64 += "=" * (4 - rem)

            raw = base64.urlsafe_b64decode(padded_b64.encode("utf-8"))
            if len(raw) < 16:
                raise ValueError("Ciphertext too short")
            iv = raw[:16]
            ciphertext = raw[16:]

            cipher = Cipher(algorithms.AES(self.key), modes.CBC(iv), backend=default_backend())
            decryptor = cipher.decryptor()
            padded = decryptor.update(ciphertext) + decryptor.finalize()

            # Strip PKCS7 padding
            pad_len = padded[-1]
            if pad_len < 1 or pad_len > 16:
                raise ValueError("Invalid padding length")
            for i in range(len(padded) - pad_len, len(padded)):
                if padded[i] != pad_len:
                    raise ValueError("Invalid padding bytes")
            return padded[:-pad_len].decode("utf-8")
        except Exception as e:
            raise ValueError(f"Decryption failed: {str(e)}")

    def encrypt_token_pair(self, access_token: str, refresh_token: str) -> tuple[str, str]:
        enc_access = self.encrypt(access_token)
        enc_refresh = self.encrypt(refresh_token) if refresh_token else ""
        return enc_access, enc_refresh

    def decrypt_token_pair(self, enc_access: str, enc_refresh: str) -> tuple[str, str]:
        access = self.decrypt(enc_access)
        refresh = self.decrypt(enc_refresh) if enc_refresh else ""
        return access, refresh
