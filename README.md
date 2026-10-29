# Biggest Loser

Aplikasi web Bahasa Melayu untuk mengurus cabaran penurunan berat bersama pasukan.

## Jalankan

Memerlukan **Node.js 22 atau lebih baharu**. Tiada pakej luaran, pemasangan npm, pangkalan data atau API key diperlukan.

```sh
npm start
```

Port lalai ialah `3000`; tukar dengan `PORT=3001 npm start`. Untuk pembangunan dengan mula semula automatik, gunakan `npm run dev`.

## Ciri

- Daftar peserta dengan nama, berat awal dan tarikh mula.
- Rekod berat pada bila-bila tarikh sehingga hari ini. Rekod tarikh yang sama dikemas kini; tarikh sebelum permulaan ditolak.
- Kedudukan berdasarkan `(berat awal − berat terkini) / berat awal × 100`. Rekod terkini ditentukan oleh tarikh, bukan urutan input. Kenaikan berat menghasilkan peratus negatif.
- Lihat sejarah peserta, padam peserta dengan pengesahan dan eksport salinan data JSON.
- Paparan responsif untuk telefon dan desktop.

## Storan dan batasan

Data disimpan dalam `localStorage` pelayar pada asal laman yang sama. Tiada akaun, penghantaran data ke pelayan atau penyegerakan antara peranti. Gunakan pelayar/peranti yang sama dan eksport data sebagai sandaran; memadam data laman atau menggunakan mod peribadi boleh kehilangan rekod. Eksport JSON belum mempunyai fungsi import dalam versi ini.

Aplikasi ini ialah prototaip untuk kegunaan setempat, bukan sistem berbilang pengguna. Gunakan nama panggilan jika peranti dikongsi. Maklumat berat ialah peribadi. Aplikasi bukan nasihat perubatan.

## Semakan

```sh
npm run check
npm test
```

Ujian meliputi pengiraan kedudukan, kenaikan berat, rekod bertarikh lampau, penggantian tarikh sama, pengesahan tarikh dan data rosak. Untuk semakan manual: daftar dua peserta, rekod berat baharu, semak kedudukan dan sejarah, muat semula untuk menguji storan, dan cuba eksport/padam.

Pelayan hanya menyajikan aset aplikasi yang disenaraikan secara jelas. Fail repositori dan fail konfigurasi tidak disajikan.
