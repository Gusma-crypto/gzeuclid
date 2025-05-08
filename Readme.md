# EUCLID AUTO BOT - ARBITRUM ONLY FOR NOW
-- Link : https://testnet.euclidswap.io/swap


# Euclid Testnet Auto Bot 
Skrip otomatis ini digunakan untuk melakukan transaksi swap pada jaringan **Arbitrum Sepolia Testnet** menggunakan protokol **EuclidSwap**, yang dirancang untuk keperluan farming airdrop testnet Euclid. Mendukung swap ETH ke EUCLID, ETH ke ANDR, dan swap acak di antara keduanya.

## ✨ Fitur

- Mendukung ETH ➜ EUCLID
- Mendukung ETH ➜ ANDR
- Mendukung swap acak EUCLID/ANDR
- Validasi jumlah ETH & estimasi gas sebelum eksekusi
- Otomatis melacak transaksi ke EuclidSwap
- Mendukung ethers.js versi 5 dan 6

## 🧾 Persyaratan

- Node.js v16+
- Akun wallet dengan ETH Sepolia (Arbitrum)
- Private key wallet (dimasukkan ke dalam file `.env`)
- Koneksi internet stabil

## 📦 Instalasi

1. **Clone repositori**
   ```bash
   git clone https://github.com/username/euclid-testnet-bot.git
   cd euclid-testnet-bot
   ```
2. **Install Dependencies**
```bash
npm install axios ethers readline dotenv
```
3. **create file format .env**
```bash
enano .env
```
add 
PRIVATE_KEY=
4. **RUN**
```bash
node index.js
```
noted:
-- **Make sure you have ETH ARBITRUM SEPOLIA for fees** 
