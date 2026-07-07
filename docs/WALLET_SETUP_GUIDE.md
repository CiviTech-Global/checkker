# Wallet Setup Guide for Checkker Testnet Play

> **You only need this if you want to test the optional blockchain betting
> feature.** For free play (ranked, casual, bot, LAN, puzzles), no wallet is
> required.

Checkker's paid games use the **BNB Smart Chain (BSC) Testnet**. The tokens
there are called **tBNB** — they look and behave like real crypto, but they
have **zero real-world value**. This makes BSC testnet the perfect sandbox for
learning and testing.

This guide explains how to create wallets, get free tBNB, and configure them
for Checkker.

---

## 1. What You Need

For a full end-to-end test of the betting flow, you need **three separate
wallets**:

| Wallet | Role | Needs tBNB? | Used In |
|---|---|---|---|
| **Player A** | White player | Yes (for stake + gas) | Mobile app / web |
| **Player B** | Black player | Yes (for stake + gas) | Mobile app / web |
| **Referee** | Server oracle | Yes (only for gas) | Server `.env` |

Optionally a **fourth wallet** as the deployer/owner/house wallet. For testing,
you can reuse the referee wallet as deployer and house.

---

## 2. Choosing a Wallet App

### Recommended for beginners: MetaMask

MetaMask is available everywhere:

- **Browser extension:** Chrome, Firefox, Edge, Brave
- **Mobile app:** iOS, Android
- Website: https://metamask.io

### Alternative: Trust Wallet

Trust Wallet is mobile-only and also supports BSC testnet. It works well with
WalletConnect.

- Website: https://trustwallet.com

For this guide we use **MetaMask**, but the steps are similar in Trust Wallet.

---

## 3. Installing MetaMask

### On a Computer

1. Open https://metamask.io/download in your browser.
2. Choose your browser and install the extension.
3. Click the MetaMask fox icon in your toolbar.

### On a Phone

1. Open the App Store (iOS) or Google Play (Android).
2. Search **MetaMask** and install the official app.
3. Open the app.

---

## 4. Creating Your First Wallet

When you open MetaMask for the first time:

1. Tap **Get Started**.
2. Choose **Create a New Wallet**.
3. If asked about analytics, choose **No Thanks** (or accept, it doesn't matter).
4. Create a strong password. This is the password for *this device only*.
5. **Secret Recovery Phrase**: MetaMask will show you 12 words.
   - Write them down **on paper** in the exact order.
   - Never store them in a notes app, screenshot, or cloud storage.
   - For testnet wallets this is less critical, but practice good habits.
6. Confirm the phrase by tapping the words in order.

You now have **Wallet 1** (use this as Player A later).

### Creating the Second and Third Wallets

MetaMask can hold multiple accounts. To create more:

1. Click the **account circle** at the top right.
2. Click **Add account or hardware wallet**.
3. Choose **Add account**.
4. A new account appears with a new address. This is **Wallet 2** (Player B).

Repeat once more for **Wallet 3** (Referee).

> Each account has its own address, but they all share the same 12-word seed
> phrase. For testing this is fine. For production, use separate seed phrases.

---

## 5. Finding Your Wallet Address

Your address is a long string starting with `0x`. It looks like:

```
0x1234567890abcdef1234567890abcdef12345678
```

To find it:

- In MetaMask, click the account name. The address copies to your clipboard.
- Or click the account circle → **Account details** → copy the address.

Label each wallet so you don't confuse them:

- `Player A`
- `Player B`
- `Referee`

---

## 6. Adding BSC Testnet to MetaMask

By default MetaMask only shows Ethereum mainnet. You need to add the BSC
testnet network.

### Automatic way (Chainlist)

1. Go to https://chainlist.org/?search=bsc%20testnet&testnets=true
2. Connect your MetaMask.
3. Find **BNB Smart Chain Testnet**.
4. Click **Add to MetaMask** and approve.

### Manual way

1. Open MetaMask and click the network dropdown at the top.
2. Click **Add network**.
3. Click **Add a network manually**.
4. Fill in these values:

   | Field | Value |
   |---|---|
   | Network name | BNB Smart Chain Testnet |
   | New RPC URL | `https://data-seed-prebsc-1-s1.binance.org:8545/` |
   | Chain ID | `97` |
   | Currency symbol | `tBNB` |
   | Block explorer URL | `https://testnet.bscscan.com` |

5. Click **Save**.

Switch to the BSC Testnet network. You should see the network name at the top
change to "BNB Smart Chain Testnet" and your balance show **0 tBNB**.

---

## 7. Getting Free tBNB from a Faucet

A **faucet** gives away free testnet tokens. You need tBNB to pay for the
testnet stakes and gas fees.

### Official BNB Chain Faucet

1. Go to https://www.bnbchain.org/en/testnet-faucet
2. Find the input field for your wallet address.
3. Paste one of your wallet addresses.
4. Complete the captcha.
5. Click **Send** or **Request**.
6. Wait 30–60 seconds.
7. Repeat for the other two wallets.

### Alternative faucets

If the official faucet is empty or slow, try:

- https://testnet.bnb.chain.org/faucet-smart
- https://faucet.quicknode.com/bsc-testnet (may require signup)
- https://cloud.google.com/application/web3/faucet (Google Cloud faucet, supports BSC testnet)

You should receive **0.1–0.5 tBNB per request**. That is plenty for testing.

### Verify the balance

In MetaMask:

1. Make sure the network is **BNB Smart Chain Testnet**.
2. Switch between your three accounts.
3. Each should show a non-zero tBNB balance.

If the balance doesn't appear after a minute, pull down to refresh in the
mobile app or click the refresh icon in the extension.

---

## 8. Exporting the Referee Private Key

The Checkker server needs the **referee wallet's private key** to create and
resolve escrows on-chain. A private key is *not* the same as the 12-word seed
phrase — it is a single long hex string for one account.

> ⚠️ **Only ever do this with a testnet wallet that contains no real funds.**

### Steps in MetaMask

1. Switch to the **Referee** account.
2. Click the account circle → **Account details**.
3. Click **Show private key**.
4. Enter your MetaMask password.
5. Copy the private key. It looks like:

   ```
   0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
   ```

6. Paste it into your `.env` file as:

   ```bash
   REFEREE_PRIVATE_KEY=0x...
   ```

7. Never share this key or commit it to Git.

---

## 9. WalletConnect / Reown Project ID

Checkker's mobile app uses **WalletConnect** (now called Reown) to talk to your
wallet. You need a free Project ID.

1. Go to https://cloud.reown.com and sign up.
2. Create a new project.
3. Copy the **Project ID**.
4. For the Flutter app, pass it at build/run time:

   ```bash
   flutter run \
     --dart-define=SERVER_URL=http://<your-server-ip>:3001 \
     --dart-define=CHECKKER_WC_PROJECT_ID=<your-project-id>
   ```

5. For the Expo web build, add it to `.env`:

   ```bash
   EXPO_PUBLIC_WC_PROJECT_ID=<your-project-id>
   ```

Without this ID, the **Connect Wallet** button may be disabled or only support
injected browser wallets.

---

## 10. Connecting a Wallet in Checkker

1. Make sure the server is running and the app is pointing to it.
2. Open Checkker on your phone or browser.
3. Tap **Connect Wallet**.
4. Choose **MetaMask** (or **WalletConnect** → MetaMask).
5. Approve the connection in MetaMask.
6. **Important:** In the network selector, choose **BNB Smart Chain Testnet**.

You are now ready to queue a ranked game. When a match is found, the app will
show the bet amount and ask you to confirm the deposit in MetaMask.

---

## 11. Recommended Test Workflow

1. **Server laptop:** deploy with the wizard and enable testnet betting.
2. **Phone 1:** install Checkker, connect **Player A** wallet.
3. **Phone 2:** install Checkker, connect **Player B** wallet (or use a browser/desktop build).
4. Both players queue the same ranked tier.
5. Both confirm the deposit in MetaMask.
6. Play the game.
7. The server automatically reports the winner and the contract pays the winner.

---

## 12. Troubleshooting

### "Insufficient funds" when depositing

- Your wallet doesn't have enough tBNB. Request more from the faucet.
- Remember the referee wallet also needs a small amount of tBNB for gas.

### "Wrong network" or deposit never confirms

- Make sure MetaMask is on **BNB Smart Chain Testnet (chain 97)**.
- Double-check `BSC_CHAIN_ID=97` in the server `.env`.

### Faucet says "address already funded"

- Most faucets limit how often you can request. Wait a few hours or use a
different faucet.

### Can't see tBNB in MetaMask

- Add the BSC Testnet network manually (step 6).
- Refresh the wallet balance.

### Private key doesn't start with `0x`

- MetaMask sometimes shows the key without the `0x` prefix. Add `0x` at the
start when pasting into `.env`.

---

## 13. Security Checklist

- [ ] These wallets are for **testnet only**.
- [ ] No real money or mainnet tokens are in these wallets.
- [ ] Private keys are stored only in `.env`, never in Git.
- [ ] Seed phrases are written on paper or stored securely offline.
- [ ] For production/mainnet, use a hardware wallet or KMS, never a plain `.env`.

---

## 14. Quick Reference

| Item | Value / Location |
|---|---|
| Network | BNB Smart Chain Testnet |
| Chain ID | `97` |
| Currency | `tBNB` |
| RPC URL | `https://data-seed-prebsc-1-s1.binance.org:8545/` |
| Faucet | https://www.bnbchain.org/en/testnet-faucet |
| Explorer | https://testnet.bscscan.com |
| WalletConnect / Reown | https://cloud.reown.com |
| Next steps | `docs/TESTNET_BETTING.md` |
