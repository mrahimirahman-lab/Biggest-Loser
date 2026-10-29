# Biggest Loser

Aplikasi web Bahasa Melayu untuk mengurus cabaran penurunan berat bersama pasukan.

## Jalankan

Memerlukan **Node.js 22 atau lebih baharu**. Antaramuka menggunakan HTML, Tailwind CSS 4 dan JavaScript tulen. Tiada pangkalan data atau API key diperlukan. CSS siap bina disertakan supaya `npm start` boleh terus digunakan.

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

## Import data

Butang **Import data JSON** menerima format yang sama seperti eksport aplikasi. Import menambah peserta baharu sahaja; jika ID atau nama sudah wujud, seluruh import ditolak supaya rekod asal tidak ditimpa. Pilih kategori Dewasa atau Junior untuk melihat ringkasan, kedudukan dan merekod berat kumpulan tersebut. Eksport merangkumi kedua-dua kategori.

Untuk dataset awal setempat, letakkan JSON dalam `local-data/tefoc-2020.json`. Fail ini diabaikan Git dan dimuatkan sekali secara automatik jika pelayar belum mempunyai data tersimpan. Pelayar yang sudah mempunyai data perlu menggunakan import JSON; data sedia ada tidak diganti secara automatik. Memadam semua peserta tidak akan mencetuskan import semula.

Data Excel pengguna tidak disertakan dalam kod GitHub. Dataset setempat disajikan kepada pelayar yang boleh mengakses pelayan ini; jangan dedahkan pelayan kepada orang ramai jika dataset peribadi berada di dalamnya. Hentikan pelayan sebelum memindahkan fail tersebut ke hosting awam.

## Dashboard kesihatan

Reka bentuk Cabaran Jom Kurus memaparkan carta Top 5 dan jadual kemajuan mengikut kategori. Pada desktop, borang terletak di kiri dan keputusan di kanan; pada telefon, keputusan dipaparkan dahulu. Pautan modul membawa ke kemas kini berat, status keseluruhan, tips kesihatan/pemakanan dan rekod kesihatan. Status menggunakan data sebenar kategori yang dipilih, bukan sasaran aktiviti rekaan.

Dalam Rekod kesihatan, pilih peserta dan simpan tidur (jam), aktiviti (minit), air (liter) atau catatan. Nilai kosong tidak dianggap sifar. Rekod boleh disunting dan satu rekod disimpan bagi setiap tarikh. Rekod ini turut disertakan dalam eksport/import JSON dan dipadam jika peserta dipadam. Data lama tanpa rekod kesihatan masih disokong. Data kekal setempat dalam pelayar; eksport sandaran secara berkala. Tiada data tidur, aktiviti atau pemakanan direka daripada fail Excel.

## Rekod mingguan

Jadual M1–M8 menunjukkan turutan rekod selepas berat awal dan tarikh asal setiap rekod. Lebih lapan rekod akan menambah lajur secara automatik. Ini mengelakkan andaian bahawa semua penimbangan dibuat tepat setiap tujuh hari. Pilihan M dalam borang mengisi tarikh dan berat rekod sedia ada untuk suntingan. Slot baharu mencadangkan tarikh tujuh hari selepas tarikh mula bagi setiap nombor minggu; semak tarikh sebelum simpan, atau pilih tarikh manual. Tarikh akan datang tidak boleh disimpan. Gunakan skrol mendatar untuk melihat semua lajur jadual.

Reka bentuk menggunakan Tailwind CSS yang dibina secara setempat; tiada kebergantungan runtime pada CDN atau Google Fonts. Data contoh dalam HTML rujukan tidak dimasukkan ke dalam peserta sebenar.

## Pembangunan Tailwind CSS

```sh
npm ci
npm run build
npm run check
npm test
npm start
```

Ubah `src/styles.css` (sumber Tailwind dan gaya komponen) dan kelas utiliti dalam `public/index.html` / `public/app.js`. Jalankan `npm run build` untuk menjana semula `public/styles.css`; jangan edit fail CSS terjana secara terus. `npm run css:watch` membina semula gaya semasa pembangunan. Commit CSS terjana bersama sumber dan lockfile.

Carian nama menapis jadual peserta sahaja; ringkasan kategori dan Top 5 kekal berdasarkan keseluruhan kategori. Klik nama peserta untuk graf berat mengikut tarikh sebenar, sejarah dan rekod kesihatan. Semua logik pengurusan data berjalan dalam Vanilla JS dengan localStorage. Ini prototaip setempat tanpa akaun atau pelayan pangkalan data bersama.

## Menu aplikasi dan BMI

Menu sisi menyediakan lima paparan: Progress Anda, Progress keseluruhan, Tips Pemakanan dan Kesihatan, Rekod Kesihatan, dan Rekod Cabaran Lepas. Menu menjadi bar boleh skrol mendatar pada telefon. Nama peserta dalam jadual keseluruhan membuka halaman kemajuan peribadi dengan graf dan sejarah mingguan.

Isi tinggi (80–250 cm) dalam Progress Anda. BMI = berat kg / (tinggi meter)^2, dengan julat dewasa umum WHO: bawah 18.5 kurang berat, 18.5 hingga bawah 25 normal, 25 hingga bawah 30 berlebihan berat, 30 ke atas obesiti. Nilai dipaparkan tanpa mengandaikan tinggi yang tiada. Untuk Junior, kategori dewasa tidak digunakan; penilaian memerlukan umur, jantina dan panduan profesional. BMI bukan diagnosis. Kategori sejarah menggunakan tinggi yang kini disimpan.

## Bacaan makmal dan lampiran

Rekod kesihatan menyimpan glukosa (mmol/L; konteks puasa/rawak/selepas makan), sistolik/diastolik (mmHg), jumlah kolesterol, HDL dan LDL (mmol/L), asid urik dan kreatinin (µmol/L). Bacaan boleh dikosongkan jika belum diuji. Tekanan darah memerlukan kedua-dua nilai dan sistolik melebihi diastolik. Tiada tafsiran makmal, diagnosis atau penukaran unit automatik; ikut unit label dan rujuk profesional kesihatan.

Upload menerima maksimum dua fail PDF, PNG, JPG atau WEBP, 1 MB setiap fail, dengan pemeriksaan jenis dan tandatangan fail. Fail disimpan sebagai data dalam localStorage bersama rekod peserta, boleh dimuat turun semula, disunting atau dibuang melalui Sunting rekod. Import/eksport peserta turut membawa lampiran. Fail tidak dihantar ke pelayan atau dibaca secara automatik untuk mengisi bacaan. Had ruang pelayar boleh menyebabkan simpanan gagal; aplikasi mengekalkan rekod asal dan memaparkan ralat. Gunakan peranti sendiri dan eksport sandaran; ini prototaip setempat tanpa kawalan akaun atau penyegerakan.

## Cabaran lepas

Rekod TEFOC 2020 yang tersedia dipaparkan berasingan berdasarkan tarikh 1 November–15 Disember 2020. Paparan ini berasal daripada data peserta semasa dalam pelayar; simpan arkib untuk salinan tetap. Borang arkib menyalin keputusan semua peserta hingga tarikh tamat yang dipilih (termasuk rekod kesihatan sehingga tarikh tersebut), tanpa memadam rekod semasa. Arkib tersimpan di kunci localStorage berasingan `jom-kurus:archives:v1`. Pilih Lihat keputusan dan klik nama peserta untuk membuka rekod mingguan. Eksport arkib menghasilkan JSON cabaran berasingan; fail arkib bukan format import peserta dan pemulihan arkib melalui UI belum disediakan.

## Banner utama

Banner besar menggunakan imej gim janaan AI yang dibundel dalam `public/assets/gym-banner.png`, dengan lelaki dewasa sedang bersenam dan lapisan gelap supaya teks jelas. Tiada permintaan imej luaran diperlukan. Panel Data & kategori telah dibuang; penapis Dewasa/Junior berada pada leaderboard dan kawalan sandaran tersedia dalam bahagian boleh buka di footer.
