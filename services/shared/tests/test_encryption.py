import pytest

from shared.encryption import TokenEncryption


def test_round_trip():
    key = "abcdefghijklmnopqrstuvwxyz123456"
    encryptor = TokenEncryption(key)

    plaintext = "my_secret_token_123!"
    encrypted = encryptor.encrypt(plaintext)
    assert encrypted != plaintext

    decrypted = encryptor.decrypt(encrypted)
    assert decrypted == plaintext

def test_refresh_token_round_trip():
    key = "abcdefghijklmnopqrstuvwxyz123456"
    encryptor = TokenEncryption(key)

    access = "access_abc"
    refresh = "refresh_xyz"
    enc_access, enc_refresh = encryptor.encrypt_token_pair(access, refresh)

    dec_access, dec_refresh = encryptor.decrypt_token_pair(enc_access, enc_refresh)
    assert dec_access == access
    assert dec_refresh == refresh

def test_iv_randomness():
    key = "abcdefghijklmnopqrstuvwxyz123456"
    encryptor = TokenEncryption(key)

    plaintext = "duplicate_value"
    enc1 = encryptor.encrypt(plaintext)
    enc2 = encryptor.encrypt(plaintext)
    assert enc1 != enc2

    assert encryptor.decrypt(enc1) == plaintext
    assert encryptor.decrypt(enc2) == plaintext

def test_tampered_ciphertext():
    key = "abcdefghijklmnopqrstuvwxyz123456"
    encryptor = TokenEncryption(key)

    plaintext = "some_secret_data"
    enc = encryptor.encrypt(plaintext)

    # Tamper with the last character
    tampered = enc[:-1] + ("A" if enc[-1] != "A" else "B")
    with pytest.raises(ValueError):
        encryptor.decrypt(tampered)

def test_wrong_key():
    key1 = "abcdefghijklmnopqrstuvwxyz123456"
    key2 = "abcdefghijklmnopqrstuvwxyz123457"

    encryptor1 = TokenEncryption(key1)
    encryptor2 = TokenEncryption(key2)

    plaintext = "super_secure_data"
    enc = encryptor1.encrypt(plaintext)

    with pytest.raises(ValueError):
        encryptor2.decrypt(enc)

def test_empty_string():
    key = "abcdefghijklmnopqrstuvwxyz123456"
    encryptor = TokenEncryption(key)

    assert encryptor.encrypt("") == ""
    assert encryptor.decrypt("") == ""
