"""
Example script demonstrating how to integrate Kakunin certificates and compliance monitoring
with a Google Antigravity SDK agent.

Ensure you have the required packages installed:
    pip install kakunin google-antigravity

Run this example with your API keys set in the environment:
    export KAK_API_KEY="your-kakunin-api-key"
    export GEMINI_API_KEY="your-gemini-api-key"
    python google_antigravity_sample.py
"""

from __future__ import annotations

import asyncio
import os
import sys

from google.antigravity import Agent, LocalAgentConfig
from kakunin import Kakunin
from kakunin.exceptions import ScopeViolationError
from kakunin.integrations.google_antigravity import get_kakunin_hooks


# 1. Define custom tools for the Google Antigravity agent
def query_market_prices(symbol: str) -> str:
    """Query current prices for a given ticker symbol."""
    print(f"[Tool Executing] query_market_prices: {symbol}")
    return f"Latest price for {symbol}: $150.00"


def execute_market_trade(symbol: str, amount: int) -> str:
    """Execute a market buy order for a symbol."""
    print(f"[Tool Executing] execute_market_trade: Buying {amount} of {symbol}")
    return f"Successfully executed trade: Buy {amount} shares of {symbol}"


async def main() -> None:
    # Validate environment setup
    kak_api_key = os.getenv("KAK_API_KEY")
    gemini_api_key = os.getenv("GEMINI_API_KEY")

    if not kak_api_key or not gemini_api_key:
        print("Error: Please set KAK_API_KEY and GEMINI_API_KEY environment variables.")
        sys.exit(1)

    print("Initializing Kakunin client...")
    # 2. Instantiate the Kakunin client
    async with Kakunin(api_key=kak_api_key) as kakunin_client:

        # 3. Register the agent in Kakunin
        print("Registering agent with Kakunin compliance platform...")
        kakunin_agent = await kakunin_client.agents.create(
            name="AlphaTrader-Antigravity",
            model="gemini-3.5-flash",
            version="1.0.0",
            model_hash="sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        )
        print(f"Registered Agent ID: {kakunin_agent.id}")

        # 4. Certify the agent to issue its X.509 certificate
        print("Issuing X.509 compliance certificate...")
        certificate = await kakunin_client.agents.certify(kakunin_agent.id)
        print(f"Certificate Serial: {certificate.serial_number}")
        print(f"Certificate Expires: {certificate.expires_at}")

        # 5. Define tool-to-scope mappings for compliance verification
        # The agent must possess these scopes in Kakunin to execute the tools.
        tool_scopes_mapping = {
            "query_market_prices": ["market.read"],
            "execute_market_trade": ["trade.execute"],
        }

        # 6. Generate Google Antigravity-compatible compliance hooks
        print("Configuring Kakunin compliance and auditing hooks...")
        kakunin_hooks = get_kakunin_hooks(
            kakunin=kakunin_client,
            agent_id=kakunin_agent.id,
            tool_scopes_mapping=tool_scopes_mapping,
        )

        # 7. Configure and create the Google Antigravity Agent
        config = LocalAgentConfig(
            model="gemini-3.5-flash",
            system_instructions=(
                "You are a helpful automated financial assistant with access to stock market tools. "
                "You can query prices and execute trades when requested."
            ),
            tools=[query_market_prices, execute_market_trade],
            hooks=kakunin_hooks,
        )

        print("\n--- Starting Google Antigravity Agent Session ---")
        async with Agent(config=config) as agent:
            # First turn: A safe query that requires 'market.read' scope
            print("\nPrompting agent to query prices...")
            try:
                response = await agent.chat("What is the current price of AAPL?")
                print(f"Agent Response: {response}")
            except ScopeViolationError as e:
                print(f"Compliance Violation Blocked Execution: {e}")

            # Second turn: A trade that requires 'trade.execute' scope
            print("\nPrompting agent to execute a trade...")
            try:
                response = await agent.chat("Buy 10 shares of AAPL.")
                print(f"Agent Response: {response}")
            except ScopeViolationError as e:
                print(f"Compliance Violation Blocked Execution: {e}")

        print("\n--- Session Finished ---")


if __name__ == "__main__":
    asyncio.run(main())
