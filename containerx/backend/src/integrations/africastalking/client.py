from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import africastalking
import httpx


logger = logging.getLogger(__name__)


class AfricaTalkingClient:
    def __init__(self, username: str | None, api_key: str | None):
        if not username or not api_key:
            raise ValueError("Africa's Talking credentials are required")

        self.username = username
        self.api_key = api_key

        africastalking.initialize(username, api_key)
        self.sms = africastalking.SMS
        self.payments = africastalking.Payment
        self.application = africastalking.Application
        self.http_client = httpx.AsyncClient(timeout=30.0)

    def _api_base(self) -> str:
        return (
            "https://api.sandbox.africastalking.com"
            if self.username == "sandbox"
            else "https://api.africastalking.com"
        )

    def _bundles_base(self) -> str:
        return (
            "https://bundles.sandbox.africastalking.com"
            if self.username == "sandbox"
            else "https://bundles.africastalking.com"
        )

    def _log_request(self, action: str, payload: Dict[str, Any]) -> None:
        redacted = {**payload}
        if "apiKey" in redacted:
            redacted["apiKey"] = "***"
        logger.info("AfricaTalking %s request: %s", action, redacted)

    async def send_sms(
        self,
        phone_numbers: List[str],
        message: str,
        sender_id: Optional[str] = None,
        enqueue: bool = True,
    ) -> Dict[str, Any]:
        try:
            formatted = [self._format_kenyan_phone(p) for p in phone_numbers]
            self._log_request(
                "sms",
                {"recipients": formatted, "sender_id": sender_id, "enqueue": enqueue},
            )
            response = self.sms.send(
                message=message, recipients=formatted, sender_id=sender_id, enqueue=enqueue
            )
            return {"success": True, "response": response}
        except Exception as exc:
            logger.error("SMS send failed: %s", exc)
            return {"success": False, "error": str(exc)}

    async def trigger_stk_push(
        self,
        phone_number: str,
        amount_kes: float,
        account_reference: str,
        transaction_desc: str = "Payment",
    ) -> Dict[str, Any]:
        try:
            formatted_phone = self._format_kenyan_phone(phone_number)
            self._log_request(
                "stk_push",
                {
                    "phone_number": formatted_phone,
                    "amount_kes": amount_kes,
                    "account_reference": account_reference,
                },
            )
            response = self.payments.mobile_checkout(
                product_name="ContainerX",
                phone_number=formatted_phone,
                amount=str(int(amount_kes)),
                currency_code="KES",
                metadata={
                    "account_reference": account_reference,
                    "transaction_desc": transaction_desc,
                },
            )
            if response.get("status") == "PendingConfirmation":
                return {
                    "success": True,
                    "checkout_request_id": response.get("checkoutRequestID"),
                    "merchant_request_id": response.get("merchantRequestID"),
                    "customer_message": response.get("customerMessage"),
                }
            return {"success": False, "error": response}
        except Exception as exc:
            logger.error("STK push failed: %s", exc)
            return {"success": False, "error": str(exc)}

    async def send_whatsapp_message(
        self,
        phone_number: str,
        template_name: str,
        parameters: Dict[str, Any],
        media_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        url = "https://api.africastalking.com/version1/whatsapp/message"
        payload: Dict[str, Any] = {
            "username": self.username,
            "to": self._format_kenyan_phone(phone_number),
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": "sw"},
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": str(value)}
                            for value in parameters.values()
                        ],
                    }
                ],
            },
        }

        if media_url:
            payload["template"]["components"].append(
                {
                    "type": "header",
                    "parameters": [
                        {
                            "type": "document" if media_url.endswith(".pdf") else "image",
                            "document" if media_url.endswith(".pdf") else "image": {"link": media_url},
                        }
                    ],
                }
            )

        try:
            self._log_request(
                "whatsapp_template",
                {"template": template_name, "phone_number": phone_number},
            )
            response = await self.http_client.post(
                url, json=payload, headers={"apiKey": self.api_key}
            )
            data = response.json()
            if response.status_code == 200:
                return {"success": True, "response": data}
            return {"success": False, "error": data}
        except Exception as exc:
            logger.error("WhatsApp send failed: %s", exc)
            return {"success": False, "error": str(exc)}

    async def send_airtime(
        self,
        recipients: List[Dict[str, str]],
        idempotency_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        url = f"{self._api_base()}/version1/airtime/send"
        payload = {"username": self.username, "recipients": recipients}
        headers = {"apiKey": self.api_key, "Content-Type": "application/json"}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        self._log_request("airtime_send", payload)
        try:
            response = await self.http_client.post(url, json=payload, headers=headers)
            data = response.json()
            if response.status_code == 200:
                return {"success": True, "response": data}
            return {"success": False, "error": data}
        except Exception as exc:
            logger.error("Airtime send failed: %s", exc)
            return {"success": False, "error": str(exc)}

    async def send_mobile_data(self, product_name: str, recipients: List[Dict[str, Any]]) -> Dict[str, Any]:
        url = f"{self._bundles_base()}/mobile/data/request"
        payload = {"username": self.username, "productName": product_name, "recipients": recipients}
        headers = {"apiKey": self.api_key, "Content-Type": "application/json"}
        self._log_request("mobile_data_send", payload)
        try:
            response = await self.http_client.post(url, json=payload, headers=headers)
            data = response.json()
            if response.status_code == 200:
                return {"success": True, "response": data}
            return {"success": False, "error": data}
        except Exception as exc:
            logger.error("Mobile data send failed: %s", exc)
            return {"success": False, "error": str(exc)}

    async def get_application_balance(self) -> Dict[str, Any]:
        url = f"{self._api_base()}/version1/user"
        headers = {
            "apiKey": self.api_key,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        }
        params = {"username": self.username}
        self._log_request("balance", params)
        try:
            response = await self.http_client.get(url, params=params, headers=headers)
            data = response.json()
            if response.status_code == 200:
                return {"success": True, "response": data}
            return {"success": False, "error": data}
        except Exception as exc:
            logger.error("Balance fetch failed: %s", exc)
            return {"success": False, "error": str(exc)}

    def _format_kenyan_phone(self, phone: str) -> str:
        cleaned = "".join(filter(str.isdigit, phone))
        if cleaned.startswith("0"):
            return f"+254{cleaned[1:]}"
        if cleaned.startswith("254"):
            return f"+{cleaned}"
        if cleaned.startswith("7"):
            return f"+254{cleaned}"
        return phone if phone.startswith("+") else f"+{cleaned}"
