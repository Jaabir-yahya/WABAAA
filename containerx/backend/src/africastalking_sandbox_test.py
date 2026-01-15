import os
import sys

import httpx


def main() -> int:
    username = os.getenv("AT_USERNAME")
    api_key = os.getenv("AT_API_KEY")

    if not username or not api_key:
        print("Missing AT_USERNAME or AT_API_KEY environment variables.")
        return 1

    url = "https://api.sandbox.africastalking.com/version1/user"
    params = {"username": username}
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "apiKey": api_key,
    }

    try:
        response = httpx.get(url, params=params, headers=headers, timeout=15.0)
        response.raise_for_status()
    except Exception as exc:
        print(f"Africa's Talking sandbox test failed: {exc}")
        return 1

    data = response.json()
    balance = data.get("userData", {}).get("balance")
    print("Africa's Talking sandbox connection OK.")
    print(f"Balance: {balance}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
