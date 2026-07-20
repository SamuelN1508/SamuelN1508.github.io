/* ================================================================================
   DUSUN DAWUNG KULON — script.js
   --------------------------------------------------------------------------------
   File ini dibagi 2 lapisan (dikirim bertahap agar tidak terpotong):

     BAGIAN 1 (di bawah ini)              → LAPISAN UI
        Render halaman publik, render panel admin, modal, navigasi,
        dan manajemen pratinjau foto (sebelum diunggah ke Supabase Storage).

     BAGIAN 2 (menyusul)                  → LAPISAN DATABASE & AUTENTIKASI
        Inisialisasi Supabase Client, objek `Auth` (Supabase Auth),
        objek `DB` (CRUD tabel `acara` & `hasil_bumi` + Supabase Storage),
        integrasi Formspree untuk form kontak, dan pemanggilan init() saat
        halaman dimuat.

   Lapisan UI di bawah ini TIDAK berubah cara pemanggilannya dibanding versi
   localStorage sebelumnya — tetap memanggil `await DB.xxx()` / `await Auth.xxx()`.
   Karena file ini digabung jadi SATU script.js, urutan definisi tidak masalah:
   fungsi-fungsi di Bagian 1 baru benar-benar dijalankan belakangan (saat user
   klik tombol / saat init() di Bagian 2 memanggilnya), jadi `DB` dan `Auth`
   sudah pasti terdefinisi duluan pada saat itu.
================================================================================= */

/* ============================================================
   STATE UI GLOBAL
   ------------------------------------------------------------
   - editIdAcara / editIdHasilBumi : id item yang sedang diedit
     di Panel Admin (null = mode tambah baru).
   - *FotoFileBaru   : objek File asli yang dipilih user lewat
     <input type="file">, disimpan agar bisa diunggah ke Supabase
     Storage saat form disubmit (Bagian 2). TIDAK dibaca sebagai
     base64 lagi — hanya dipakai untuk pratinjau lokal via
     URL.createObjectURL().
   - *FotoUrlTersimpan : URL publik foto yang SUDAH ada di Supabase
     Storage (dipakai saat mode edit, diisi oleh editAcara/
     editHasilBumi di Bagian 2).
   - *FotoDihapus    : true jika pengurus menekan "Hapus Foto",
     supaya Bagian 2 tahu perlu menghapus foto dari Storage +
     mengosongkan kolom foto di database saat submit.
============================================================ */
let editIdAcara = null;
let editIdHasilBumi = null;

let acaraFotoFileBaru = null;
let acaraFotoUrlTersimpan = '';
let acaraFotoDihapus = false;

let produkFotoFileBaru = null;
let produkFotoUrlTersimpan = '';
let produkFotoDihapus = false;

/* ============================================================
   TOAST NOTIFIKASI
============================================================ */
function showToast(message) {
  const wrap = document.getElementById('toast-wrap');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/* ============================================================
   NAVIGASI ANTAR HALAMAN (SPA sederhana, tanpa reload)
============================================================ */
function gotoPage(pageId) {
  document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');
  document.querySelectorAll('[data-nav]').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll(`[data-nav="${pageId}"]`).forEach(btn => btn.classList.add('active'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   HELPER RENDER KARTU (dipakai renderAcara & renderHasilBumi)
   ------------------------------------------------------------
   CATATAN PERUBAHAN: parameter `foto` sekarang berisi URL publik
   dari Supabase Storage (contoh: https://xxxx.supabase.co/storage/
   v1/object/public/foto-dusun/acara/namafile.jpg), BUKAN string
   base64 lagi. Cara pakainya di <img src="..."> tetap sama persis
   karena keduanya sama-sama string URL yang valid untuk atribut src.
============================================================ */
function fotoAtauPlaceholder(foto, warna) {
  if (foto) return `<img src="${foto}" alt="" class="w-full h-40 object-cover rounded-t-xl2" loading="lazy">`;
  return `<div class="w-full h-40 rounded-t-xl2 flex items-center justify-center text-cream text-3xl" style="background:${warna}">🌿</div>`;
}
function kartuSkeleton(n) {
  return Array.from({ length: n }).map(() => `
    <div class="bg-white rounded-xl2 border border-[#EFE7D6] overflow-hidden">
      <div class="w-full h-40 skeleton"></div>
      <div class="p-4 space-y-2">
        <div class="h-3 w-1/3 skeleton rounded"></div>
        <div class="h-4 w-2/3 skeleton rounded"></div>
        <div class="h-3 w-full skeleton rounded"></div>
      </div>
    </div>`).join('');
}
function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }

/* ---------- Render halaman publik: ACARA ---------- */
async function renderAcara() {
  const list = document.getElementById('acara-list');
  const preview = document.getElementById('home-acara-preview');
  list.innerHTML = kartuSkeleton(3);
  preview.innerHTML = kartuSkeleton(3);

  const items = await DB.acara.getAll(); // <-- Bagian 2: SELECT dari tabel acara di Supabase

  const kartuHtml = items.map(item => `
    <div class="bg-white rounded-xl2 border border-[#EFE7D6] overflow-hidden hover:shadow-md transition">
      ${fotoAtauPlaceholder(item.foto, '#3F6B4C')}
      <div class="p-4">
        <p class="text-[11px] font-bold text-terakota uppercase tracking-wide mb-1">${escapeHtml(item.tanggal)}</p>
        <h3 class="font-display text-lg text-ink mb-1">${escapeHtml(item.judul)}</h3>
        <p class="text-sm text-coklat/80">${escapeHtml(item.deskripsi)}</p>
      </div>
    </div>`);

  list.innerHTML = kartuHtml.join('') || `<p class="text-sm text-coklat/50 col-span-full text-center py-10">Belum ada acara. Pengurus dapat menambahkannya lewat Panel Admin.</p>`;
  preview.innerHTML = kartuHtml.slice(0, 3).join('') || `<p class="text-sm text-coklat/50 col-span-full text-center py-6">Belum ada acara terbaru.</p>`;
}

/* ---------- Render halaman publik: HASIL BUMI ---------- */
async function renderHasilBumi() {
  const list = document.getElementById('hasilbumi-list');
  list.innerHTML = kartuSkeleton(3);

  const items = await DB.hasilBumi.getAll(); // <-- Bagian 2: SELECT dari tabel hasil_bumi di Supabase

  list.innerHTML = items.map(item => `
    <div class="bg-white rounded-xl2 border border-[#EFE7D6] overflow-hidden hover:shadow-md transition">
      ${fotoAtauPlaceholder(item.foto, '#C1652F')}
      <div class="p-4">
        ${item.pemilik ? `<p class="text-[11px] font-bold text-hijau uppercase tracking-wide mb-1">${escapeHtml(item.pemilik)}</p>` : ''}
        <h3 class="font-display text-lg text-ink mb-1">${escapeHtml(item.judul)}</h3>
        <p class="text-sm text-coklat/80">${escapeHtml(item.deskripsi)}</p>
      </div>
    </div>`).join('') || `<p class="text-sm text-coklat/50 col-span-full text-center py-10">Belum ada produk hasil bumi. Pengurus dapat menambahkannya lewat Panel Admin.</p>`;
}

/* ---------- Modal buka/tutup ---------- */
function openModal(id) { const m = document.getElementById(id); m.classList.remove('hidden'); m.classList.add('flex'); }
function closeModal(id) { const m = document.getElementById(id); m.classList.add('hidden'); m.classList.remove('flex'); }

/* ---------- Alur masuk Panel Admin (cek sesi Supabase Auth lebih dulu) ---------- */
function openAdminEntry() {
  if (Auth.isLoggedIn()) {
    openModal('modal-admin');
    setAdminSessionInfo();   // <-- didefinisikan di Bagian 2 (butuh bentuk sesi Supabase)
    renderAdminLists();
  } else {
    openModal('modal-login');
    setTimeout(() => document.getElementById('login-email').focus(), 100);
  }
}

/* ---------- Buka Panel Admin ----------
   Pengurus dusun membuka Panel Admin dengan cara:
     1) Klik logo "DK" (mobile) atau klik tulisan footer (desktop), ATAU
     2) Buka alamat situs dengan tambahan  #admin-dusun  di belakangnya
        (contoh: https://situs-dusun.com/#admin-dusun), lalu tekan Enter/refresh. */
function ketukRahasiaAdmin() {
  openAdminEntry();
}

/* Cek juga akses lewat #admin-dusun di URL saat halaman pertama kali dimuat */
function cekAksesAdminLewatURL() {
  if (window.location.hash === '#admin-dusun') {
    openAdminEntry();
  }
}

/* ---------- Tab di dalam panel admin ---------- */
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(el => el.classList.add('hidden'));
  document.getElementById('admin-tab-' + tab).classList.remove('hidden');
  const warnaAktif = { acara: 'bg-hijau text-cream', hasilbumi: 'bg-terakota text-cream' };
  ['acara', 'hasilbumi'].forEach(t => {
    document.getElementById('tab-btn-' + t).className =
      'admin-tab-btn px-4 py-2 rounded-full text-sm font-semibold ' + (tab === t ? warnaAktif[t] : 'bg-cream2 text-coklat');
  });
}

/* ============================================================
   MANAJEMEN PRATINJAU FOTO — ACARA
   ------------------------------------------------------------
   Foto TIDAK lagi dibaca sebagai base64. File asli disimpan di
   `acaraFotoFileBaru` dan baru diunggah ke Supabase Storage saat
   form benar-benar disubmit (lihat handleAddAcara di Bagian 2).
   Pratinjau di layar memakai URL.createObjectURL() — URL sementara
   di memori browser, otomatis tidak berlaku setelah halaman ditutup.
============================================================ */
function previewFotoAcara(event) {
  const file = event.target.files[0];
  if (!file) return;
  acaraFotoFileBaru = file;
  acaraFotoDihapus = false;
  const preview = document.getElementById('acara-preview');
  preview.src = URL.createObjectURL(file);
  preview.classList.remove('hidden');
}

function gantiAcara() {
  document.getElementById('acara-foto-hidden').click();
}

function hapusAcaraFoto() {
  acaraFotoFileBaru = null;
  acaraFotoDihapus = true;
  document.getElementById('acara-foto').value = '';
  document.getElementById('acara-preview').classList.add('hidden');
  document.getElementById('acara-foto-edit-mode').classList.add('hidden');
  document.getElementById('acara-foto-wrapper').classList.remove('hidden');
  showToast('Foto akan dihapus saat perubahan disimpan.');
}

/* ============================================================
   MANAJEMEN PRATINJAU FOTO — HASIL BUMI
   (pola sama persis dengan foto Acara di atas)
============================================================ */
function previewFotoProduk(event) {
  const file = event.target.files[0];
  if (!file) return;
  produkFotoFileBaru = file;
  produkFotoDihapus = false;
  const preview = document.getElementById('produk-preview');
  preview.src = URL.createObjectURL(file);
  preview.classList.remove('hidden');
}

function gantiProduk() {
  document.getElementById('produk-foto-hidden').click();
}

function hapusProdukFoto() {
  produkFotoFileBaru = null;
  produkFotoDihapus = true;
  document.getElementById('produk-foto').value = '';
  document.getElementById('produk-preview').classList.add('hidden');
  document.getElementById('produk-foto-edit-mode').classList.add('hidden');
  document.getElementById('produk-foto-wrapper').classList.remove('hidden');
  showToast('Foto akan dihapus saat perubahan disimpan.');
}

/* ---------- Daftar di dalam panel admin (dengan tombol edit/hapus) ---------- */
async function renderAdminLists() {
  const [acaraItems, hasilBumiItems] = await Promise.all([DB.acara.getAll(), DB.hasilBumi.getAll()]);

  const acaraBox = document.getElementById('admin-acara-list');
  acaraBox.innerHTML = acaraItems.map(item => `
    <div class="flex items-center justify-between gap-2 bg-white border border-[#EFE7D6] rounded-lg px-3 py-2 text-sm">
      <span class="truncate pr-2">${escapeHtml(item.judul)}</span>
      <span class="flex gap-3 shrink-0">
        <button onclick="editAcara('${item.id}')" class="text-hijau text-xs font-bold">Edit</button>
        <button onclick="hapusAcara('${item.id}')" class="text-terakota text-xs font-bold">Hapus</button>
      </span>
    </div>`).join('') || `<p class="text-xs text-coklat/50">Belum ada data.</p>`;

  const produkBox = document.getElementById('admin-hasilbumi-list');
  produkBox.innerHTML = hasilBumiItems.map(item => `
    <div class="flex items-center justify-between gap-2 bg-white border border-[#EFE7D6] rounded-lg px-3 py-2 text-sm">
      <span class="truncate pr-2">${escapeHtml(item.judul)}</span>
      <span class="flex gap-3 shrink-0">
        <button onclick="editHasilBumi('${item.id}')" class="text-hijau text-xs font-bold">Edit</button>
        <button onclick="hapusHasilBumi('${item.id}')" class="text-terakota text-xs font-bold">Hapus</button>
      </span>
    </div>`).join('') || `<p class="text-xs text-coklat/50">Belum ada data.</p>`;
}

/* ============================================================
   MENYUSUL DI BAGIAN 2 (balas "Lanjut" untuk menerimanya):
   ------------------------------------------------------------
   - Inisialisasi Supabase Client (URL + anon key)
   - Objek Auth  → signInWithPassword, signOut, sesi aktif, setAdminSessionInfo()
   - Objek DB    → CRUD acara & hasil_bumi + unggah/hapus foto di Supabase Storage
   - handleAdminLogin, handleLogout
   - handleAddAcara, editAcara, batalEditAcara, hapusAcara
   - handleAddHasilBumi, editHasilBumi, batalEditHasilBumi, hapusHasilBumi
   - handleKontakSubmit → integrasi Formspree
   - IIFE init() yang dijalankan saat halaman dimuat
============================================================ */

/* ================================================================================
   BAGIAN 2 — LAPISAN DATABASE (Supabase) & AUTENTIKASI (Supabase Auth)
   --------------------------------------------------------------------------------
   ⚠️ WAJIB DISIAPKAN DI DASHBOARD SUPABASE SEBELUM KODE INI BERFUNGSI:

   1) Project URL & anon public key → isi SUPABASE_URL & SUPABASE_ANON_KEY di
      bawah (Project Settings → API).

   2) Buat tabel lewat SQL Editor:

        create table acara (
          id uuid primary key default gen_random_uuid(),
          judul text not null,
          tanggal text not null,
          deskripsi text not null,
          foto text,
          created_at timestamptz default now()
        );

        create table hasil_bumi (
          id uuid primary key default gen_random_uuid(),
          judul text not null,
          pemilik text,
          deskripsi text not null,
          foto text,
          created_at timestamptz default now()
        );

   3) Aktifkan Row Level Security (RLS) lalu buat policy: warga (publik) boleh
      MEMBACA, tapi hanya pengurus yang login (authenticated) boleh
      tambah/ubah/hapus:

        alter table acara enable row level security;
        alter table hasil_bumi enable row level security;

        create policy "Publik boleh baca acara" on acara for select using (true);
        create policy "Login boleh kelola acara" on acara for all
          using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

        create policy "Publik boleh baca hasil_bumi" on hasil_bumi for select using (true);
        create policy "Login boleh kelola hasil_bumi" on hasil_bumi for all
          using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

   4) Buat akun pengurus lewat Authentication → Users → Add user (isi email +
      password yang nanti dipakai login di Panel Admin). Kredensial demo lama
      (admin@dawungkulon.id / dawung123) di modal login TIDAK BERLAKU LAGI —
      lihat catatan di bagian akhir chat soal teks demo tersebut.

   5) Buat Storage bucket bernama  foto-dusun  dan set jadi PUBLIC (Storage →
      New bucket → centang "Public bucket"), lalu tambahkan policy agar hanya
      pengguna login yang boleh unggah/hapus:

        create policy "Publik boleh lihat foto" on storage.objects for select
          using (bucket_id = 'foto-dusun');
        create policy "Login boleh unggah foto" on storage.objects for insert
          with check (bucket_id = 'foto-dusun' and auth.role() = 'authenticated');
        create policy "Login boleh hapus foto" on storage.objects for delete
          using (bucket_id = 'foto-dusun' and auth.role() = 'authenticated');
================================================================================= */

const SUPABASE_URL = 'https://pacnfzxxtdtvztvxvztk.supabase.co';   // <-- GANTI
const SUPABASE_ANON_KEY = 'sb_publishable_g9gsjUQjZ53x1jlzRQ_oHg_ZNiwxqsH';          // <-- GANTI
const NAMA_BUCKET_FOTO = 'foto-dusun';

// Formspree: buat form baru di formspree.io, salin Form ID-nya ke sini.
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/GANTI-DENGAN-FORM-ID-ANDA'; // <-- GANTI

// Nama variabel client sengaja BUKAN `supabase` agar tidak bentrok dengan
// objek global `supabase` yang datang dari CDN (window.supabase.createClient).
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ============================================================
   AUTENTIKASI — Supabase Auth
   ------------------------------------------------------------
   Sesi disimpan otomatis oleh Supabase (localStorage internal miliknya),
   dan kita cache di `_sesiAktif` supaya Auth.isLoggedIn()/currentUser()
   di Bagian 1 (UI) tetap bisa dipanggil secara SINKRON seperti sebelumnya,
   tanpa perlu mengubah kode UI.
============================================================ */
let _sesiAktif = null;

supabaseClient.auth.onAuthStateChange((_event, session) => {
  _sesiAktif = session;
});

function terjemahkanErrorAuth(error) {
  const pesan = (error && error.message) || '';
  if (pesan.includes('Invalid login credentials')) return 'Email atau kata sandi salah.';
  if (pesan.includes('Email not confirmed')) return 'Email belum dikonfirmasi. Cek kotak masuk email Anda.';
  return pesan || 'Gagal masuk. Coba lagi.';
}

const Auth = {
  async login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, message: terjemahkanErrorAuth(error) };
    _sesiAktif = data.session;
    return { ok: true, user: data.user };
  },
  async logout() {
    await supabaseClient.auth.signOut();
    _sesiAktif = null;
  },
  currentUser() {
    return _sesiAktif ? _sesiAktif.user : null;
  },
  isLoggedIn() { return !!_sesiAktif; }
};

function setAdminSessionInfo() {
  const user = Auth.currentUser();
  const el = document.getElementById('admin-session-info');
  el.textContent = user ? ('Masuk sebagai ' + user.email) : '';
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-submit-btn');
  const errorEl = document.getElementById('login-error');
  errorEl.classList.add('hidden');
  btn.disabled = true; btn.textContent = 'Memeriksa...';

  const hasil = await Auth.login(email, password); // <-- panggilan Supabase Auth

  btn.disabled = false; btn.textContent = 'Masuk';
  if (hasil.ok) {
    document.getElementById('login-form').reset();
    closeModal('modal-login');
    openModal('modal-admin');
    setAdminSessionInfo();
    renderAdminLists();
    const namaTampil = (hasil.user.user_metadata && hasil.user.user_metadata.nama) || hasil.user.email;
    showToast('Selamat datang kembali, ' + namaTampil + '.');
  } else {
    errorEl.textContent = hasil.message;
    errorEl.classList.remove('hidden');
  }
}

async function handleLogout() {
  await Auth.logout();
  closeModal('modal-admin');
  showToast('Anda telah keluar dari Panel Admin.');
}

/* ============================================================
   PENYIMPANAN FOTO — Supabase Storage
   ------------------------------------------------------------
   unggahFoto()      : unggah File ke bucket, kembalikan URL publik.
   hapusFotoDariUrl(): hapus objek di Storage berdasarkan URL publiknya
                       (dipanggil saat foto diganti/dihapus/item dihapus).
============================================================ */
async function unggahFoto(file, folder) {
  const namaFile = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`;
  const { error } = await supabaseClient.storage.from(NAMA_BUCKET_FOTO).upload(namaFile, file, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) {
    console.error('Gagal unggah foto:', error);
    showToast('Gagal mengunggah foto. Data lain tetap disimpan.');
    return null;
  }
  const { data } = supabaseClient.storage.from(NAMA_BUCKET_FOTO).getPublicUrl(namaFile);
  return data.publicUrl;
}

async function hapusFotoDariUrl(url) {
  if (!url) return;
  try {
    const penanda = `/${NAMA_BUCKET_FOTO}/`;
    const idx = url.indexOf(penanda);
    if (idx === -1) return;
    const path = url.substring(idx + penanda.length);
    await supabaseClient.storage.from(NAMA_BUCKET_FOTO).remove([path]);
  } catch (e) {
    console.error('Gagal menghapus foto lama:', e);
  }
}

/* ============================================================
   LAPISAN DATABASE — CRUD tabel `acara` & `hasil_bumi` via Supabase
============================================================ */
const DB = {
  acara: {
    async getAll() {
      const { data, error } = await supabaseClient.from('acara').select('*').order('created_at', { ascending: false });
      if (error) { console.error(error); showToast('Gagal memuat data acara.'); return []; }
      return data;
    },
    async create(item) {
      const { data, error } = await supabaseClient.from('acara').insert(item).select().single();
      if (error) { console.error(error); showToast('Gagal menyimpan acara.'); throw error; }
      return data;
    },
    async update(id, patch) {
      const { data, error } = await supabaseClient.from('acara').update(patch).eq('id', id).select().single();
      if (error) { console.error(error); showToast('Gagal memperbarui acara.'); throw error; }
      return data;
    },
    async remove(id) {
      const { error } = await supabaseClient.from('acara').delete().eq('id', id);
      if (error) { console.error(error); showToast('Gagal menghapus acara.'); throw error; }
      return true;
    }
  },

  hasilBumi: {
    async getAll() {
      const { data, error } = await supabaseClient.from('hasil_bumi').select('*').order('created_at', { ascending: false });
      if (error) { console.error(error); showToast('Gagal memuat data hasil bumi.'); return []; }
      return data;
    },
    async create(item) {
      const { data, error } = await supabaseClient.from('hasil_bumi').insert(item).select().single();
      if (error) { console.error(error); showToast('Gagal menyimpan produk.'); throw error; }
      return data;
    },
    async update(id, patch) {
      const { data, error } = await supabaseClient.from('hasil_bumi').update(patch).eq('id', id).select().single();
      if (error) { console.error(error); showToast('Gagal memperbarui produk.'); throw error; }
      return data;
    },
    async remove(id) {
      const { error } = await supabaseClient.from('hasil_bumi').delete().eq('id', id);
      if (error) { console.error(error); showToast('Gagal menghapus produk.'); throw error; }
      return true;
    }
  }
};

/* ---------- CRUD ACARA (dari Panel Admin) ---------- */
async function handleAddAcara(e) {
  e.preventDefault();
  const btn = document.getElementById('acara-submit-btn');
  const judul = document.getElementById('acara-judul').value.trim();
  const tanggal = document.getElementById('acara-tanggal').value.trim();
  const deskripsi = document.getElementById('acara-deskripsi').value.trim();

  btn.disabled = true; btn.textContent = 'Menyimpan...';

  try {
    // Tentukan foto akhir: unggah baru → ganti; ditandai hapus → kosongkan; selain itu pertahankan yang lama.
    let fotoFinal = acaraFotoUrlTersimpan || null;
    if (acaraFotoFileBaru) {
      if (acaraFotoUrlTersimpan) await hapusFotoDariUrl(acaraFotoUrlTersimpan);
      fotoFinal = await unggahFoto(acaraFotoFileBaru, 'acara'); // <-- Supabase Storage
    } else if (acaraFotoDihapus) {
      if (acaraFotoUrlTersimpan) await hapusFotoDariUrl(acaraFotoUrlTersimpan);
      fotoFinal = null;
    }

    if (editIdAcara !== null) {
      await DB.acara.update(editIdAcara, { judul, tanggal, deskripsi, foto: fotoFinal }); // <-- CRUD: UPDATE
      showToast('Acara berhasil diperbarui.');
      batalEditAcara();
    } else {
      await DB.acara.create({ judul, tanggal, deskripsi, foto: fotoFinal }); // <-- CRUD: CREATE
      showToast('Acara baru berhasil disimpan.');
      e.target.reset();
      document.getElementById('acara-preview').classList.add('hidden');
      acaraFotoFileBaru = null; acaraFotoUrlTersimpan = ''; acaraFotoDihapus = false;
    }
  } catch (err) {
    // Pesan error sudah ditampilkan lewat showToast di lapisan DB/unggahFoto.
  }

  btn.disabled = false; btn.textContent = editIdAcara ? 'Simpan Perubahan' : 'Simpan Acara';

  await renderAcara();
  await renderAdminLists();
}

async function editAcara(id) {
  const items = await DB.acara.getAll(); // <-- CRUD: READ
  const item = items.find(a => a.id === id);
  if (!item) return;
  editIdAcara = id;
  acaraFotoUrlTersimpan = item.foto || '';
  acaraFotoFileBaru = null;
  acaraFotoDihapus = false;

  document.getElementById('acara-judul').value = item.judul;
  document.getElementById('acara-tanggal').value = item.tanggal;
  document.getElementById('acara-deskripsi').value = item.deskripsi;

  const wrapperMode = document.getElementById('acara-foto-wrapper');
  const editMode = document.getElementById('acara-foto-edit-mode');

  if (item.foto) {
    wrapperMode.classList.add('hidden');
    editMode.classList.remove('hidden');
    document.getElementById('acara-foto-display').src = item.foto; // URL publik langsung dari Supabase Storage
  } else {
    wrapperMode.classList.remove('hidden');
    editMode.classList.add('hidden');
  }

  document.getElementById('acara-submit-btn').textContent = 'Simpan Perubahan';
  document.getElementById('acara-cancel-btn').classList.remove('hidden');
  switchAdminTab('acara');
  document.getElementById('acara-judul').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function batalEditAcara() {
  editIdAcara = null;
  acaraFotoFileBaru = null;
  acaraFotoUrlTersimpan = '';
  acaraFotoDihapus = false;
  const form = document.getElementById('acara-judul').closest('form');
  form.reset();
  document.getElementById('acara-preview').classList.add('hidden');
  document.getElementById('acara-foto-wrapper').classList.remove('hidden');
  document.getElementById('acara-foto-edit-mode').classList.add('hidden');
  document.getElementById('acara-submit-btn').textContent = 'Simpan Acara';
  document.getElementById('acara-cancel-btn').classList.add('hidden');
}

async function hapusAcara(id) {
  if (!confirm('Yakin ingin menghapus acara ini?')) return;
  const items = await DB.acara.getAll();
  const item = items.find(a => a.id === id);
  await DB.acara.remove(id); // <-- CRUD: DELETE
  if (item && item.foto) await hapusFotoDariUrl(item.foto);
  if (editIdAcara === id) batalEditAcara();
  await renderAcara();
  await renderAdminLists();
  showToast('Acara dihapus.');
}

/* ---------- CRUD HASIL BUMI (dari Panel Admin) ---------- */
async function handleAddHasilBumi(e) {
  e.preventDefault();
  const btn = document.getElementById('produk-submit-btn');
  const judul = document.getElementById('produk-judul').value.trim();
  const pemilik = document.getElementById('produk-pemilik').value.trim();
  const deskripsi = document.getElementById('produk-deskripsi').value.trim();

  btn.disabled = true; btn.textContent = 'Menyimpan...';

  try {
    let fotoFinal = produkFotoUrlTersimpan || null;
    if (produkFotoFileBaru) {
      if (produkFotoUrlTersimpan) await hapusFotoDariUrl(produkFotoUrlTersimpan);
      fotoFinal = await unggahFoto(produkFotoFileBaru, 'hasil-bumi'); // <-- Supabase Storage
    } else if (produkFotoDihapus) {
      if (produkFotoUrlTersimpan) await hapusFotoDariUrl(produkFotoUrlTersimpan);
      fotoFinal = null;
    }

    if (editIdHasilBumi !== null) {
      const patch = { judul, pemilik, deskripsi, foto: fotoFinal };
      await DB.hasilBumi.update(editIdHasilBumi, patch); // <-- CRUD: UPDATE
      showToast('Produk berhasil diperbarui.');
      batalEditHasilBumi();
    } else {
      await DB.hasilBumi.create({ judul, pemilik, deskripsi, foto: fotoFinal }); // <-- CRUD: CREATE
      showToast('Produk hasil bumi berhasil disimpan.');
      e.target.reset();
      document.getElementById('produk-preview').classList.add('hidden');
      produkFotoFileBaru = null; produkFotoUrlTersimpan = ''; produkFotoDihapus = false;
    }
  } catch (err) {
    // Pesan error sudah ditampilkan lewat showToast di lapisan DB/unggahFoto.
  }

  btn.disabled = false; btn.textContent = editIdHasilBumi ? 'Simpan Perubahan' : 'Simpan Produk';

  await renderHasilBumi();
  await renderAdminLists();
}

async function editHasilBumi(id) {
  const items = await DB.hasilBumi.getAll(); // <-- CRUD: READ
  const item = items.find(h => h.id === id);
  if (!item) return;
  editIdHasilBumi = id;
  produkFotoUrlTersimpan = item.foto || '';
  produkFotoFileBaru = null;
  produkFotoDihapus = false;

  document.getElementById('produk-judul').value = item.judul;
  document.getElementById('produk-pemilik').value = item.pemilik || '';
  document.getElementById('produk-deskripsi').value = item.deskripsi;

  const wrapperMode = document.getElementById('produk-foto-wrapper');
  const editMode = document.getElementById('produk-foto-edit-mode');

  if (item.foto) {
    wrapperMode.classList.add('hidden');
    editMode.classList.remove('hidden');
    document.getElementById('produk-foto-display').src = item.foto;
  } else {
    wrapperMode.classList.remove('hidden');
    editMode.classList.add('hidden');
  }

  document.getElementById('produk-submit-btn').textContent = 'Simpan Perubahan';
  document.getElementById('produk-cancel-btn').classList.remove('hidden');
  switchAdminTab('hasilbumi');
  document.getElementById('produk-judul').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function batalEditHasilBumi() {
  editIdHasilBumi = null;
  produkFotoFileBaru = null;
  produkFotoUrlTersimpan = '';
  produkFotoDihapus = false;
  const form = document.getElementById('produk-judul').closest('form');
  form.reset();
  document.getElementById('produk-preview').classList.add('hidden');
  document.getElementById('produk-foto-wrapper').classList.remove('hidden');
  document.getElementById('produk-foto-edit-mode').classList.add('hidden');
  document.getElementById('produk-submit-btn').textContent = 'Simpan Produk';
  document.getElementById('produk-cancel-btn').classList.add('hidden');
}

async function hapusHasilBumi(id) {
  if (!confirm('Yakin ingin menghapus produk ini?')) return;
  const items = await DB.hasilBumi.getAll();
  const item = items.find(h => h.id === id);
  await DB.hasilBumi.remove(id); // <-- CRUD: DELETE
  if (item && item.foto) await hapusFotoDariUrl(item.foto);
  if (editIdHasilBumi === id) batalEditHasilBumi();
  await renderHasilBumi();
  await renderAdminLists();
  showToast('Produk dihapus.');
}

/* ---------- Kontak: kirim pesan lewat Web3Forms ---------- */

document.addEventListener('DOMContentLoaded', function() {
    
  const formKontak = document.getElementById('form-kontak');
  const tombolKirim = document.getElementById('tombol-kirim');

  if (formKontak && tombolKirim) {
      
    formKontak.addEventListener('submit', function(e) {
      e.preventDefault(); 
      
      const teksAsliTombol = tombolKirim.innerText;
      tombolKirim.innerText = "Mengirim pesan...";
      tombolKirim.disabled = true;

      // Mengambil data dari form
      const formData = new FormData(formKontak);

      // MENGIRIM KE FORMSPREE
      // Ganti KODE_UNIK_ANDA dengan kode milik Anda
      fetch('https://formspree.io/f/05903cf5-865f-44f1-9b93-98a8e0d8b560', {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
      })
      .then(response => {
        if (response.ok) {
          alert("Terima kasih! Pesan Anda berhasil dikirim ke pengurus dusun.");
          
          // Membersihkan isi form
          formKontak.reset(); 
        } else {
          alert("Maaf, terjadi kesalahan. Silakan coba lagi.");
        }
      })
      .catch(error => {
        console.log(error);
        alert("Maaf, sistem sedang gangguan.");
      })
      .finally(() => {
        // Kembalikan tombol
        tombolKirim.innerText = teksAsliTombol;
        tombolKirim.disabled = false;
      });
    });
    
  }
});