import smtplib
import ssl
import time
import os
from email.message import EmailMessage

# ==============================================================================
# KONFIGURASI AKUN GMAIL PENGIRIM
# ==============================================================================
SENDER_EMAIL = "samuelnatanael08@gmail.com"
SENDER_NAME = "Samuel Natanael"

# Masukkan 16 digit App Password Google Anda di bawah ini (atau ketik saat program jalan)
# Cara buat (1 menit):
# 1. Buka: https://myaccount.google.com/apppasswords
# 2. Ketik nama bebas (misal: "Kirim CV"), lalu klik Create.
# 3. Copy 16 huruf yang muncul ke dalam tanda kutip di bawah ini:
APP_PASSWORD = ""

# ==============================================================================
# FILE LAMPIRAN CV (Sudah di-generate otomatis menjadi PDF)
# ==============================================================================
PDF_FNB = "CV_Samuel_Natanael_PartTime_FnB.pdf"
PDF_TUTOR = "CV_Samuel_Natanael_PartTime_Tutor.pdf"

# ==============================================================================
# TEMPLATE BODY EMAIL
# ==============================================================================
def get_fnb_body(company_name):
    return f"""Yth. Tim HRD / Manajemen Rekrutmen {company_name},

Perkenalkan, nama saya Samuel Natanael, mahasiswa aktif di Universitas Kristen Duta Wacana (UKDW) Yogyakarta. Melalui email ini, saya bermaksud mengajukan lamaran pekerjaan paruh waktu (Part-Time / Daily Worker) untuk posisi operasional seperti Kasir, Server/Waiter, Runner, maupun Crew Outlet di {company_name}.

Karena lokasi kampus dan aktivitas harian saya berada tepat di sekitar kawasan UKDW, Kotabaru, Sagan, dan Lempuyangan, saya memiliki mobilitas yang sangat dekat dan siap bekerja dengan jadwal shift yang fleksibel (termasuk shift sore/malam maupun akhir pekan).

Saya memiliki pengalaman kerja di bidang pelayanan pelanggan (Student Staff UKDW), pengelolaan transaksi dan kas (Bendahara BEM FTI), serta komunikasi bahasa Inggris aktif (IELTS 7.5). Saya adalah pribadi yang jujur, cekatan, disiplin waktu, dan sangat cepat belajar mengikuti SOP.

Sebagai bahan pertimbangan, bersama email ini saya lampirkan CV terbaru saya. Apabila saat ini belum terdapat posisi yang kosong, besar harapan saya agar CV ini dapat disimpan dalam database kandidat (talent pool) {company_name} untuk kebutuhan mendatang.

Terima kasih atas waktu dan perhatian Bapak/Ibu.

Hormat saya,

Samuel Natanael
Telp/WA: 08989208214
Email: samuelnatanael08@gmail.com
LinkedIn: https://www.linkedin.com/in/samuel-natanael-6a3582339/
"""

def get_tutor_body(company_name):
    return f"""Yth. Tim HRD / Koordinator Akademik {company_name},

Perkenalkan, nama saya Samuel Natanael, mahasiswa S1 Informatika di Universitas Kristen Duta Wacana (UKDW) Yogyakarta (IPK 3.76/4.00). Melalui email ini, saya ingin mengajukan diri sebagai Pengajar / Tutor Part-Time di {company_name} untuk bidang Coding/Pemrograman, Matematika/Logika, atau Bahasa Inggris.

Saya memiliki pengalaman lebih dari 2 tahun sebagai Asisten Dosen, Tutor Akademik, serta Pengajar Persiapan Olimpiade (OSN) tingkat SMA, dengan tingkat kepuasan siswa mencapai 90%+. Selain penguasaan di bidang algoritma dan pemrograman, saya juga memiliki sertifikasi kemampuan Bahasa Inggris aktif (IELTS 7.5 / TOEFL 567).

Saya sangat menyukai dunia mengajar, sabar dalam membimbing siswa, dan siap mengajar secara tatap muka di wilayah Yogyakarta (khususnya area Kotabaru, Sagan, Gondokusuman, dan sekitarnya) maupun secara online.

Bersama email ini saya lampirkan CV terbaru saya sebagai bahan pertimbangan Bapak/Ibu. Terima kasih atas waktu dan kesempatan yang diberikan.

Hormat saya,

Samuel Natanael
Telp/WA: 08989208214
Email: samuelnatanael08@gmail.com
LinkedIn: https://www.linkedin.com/in/samuel-natanael-6a3582339/
"""

# ==============================================================================
# DAFTAR TARGET PERUSAHAAN (KOTABARU, SAGAN, LEMPUYANGAN, YOGYAKARTA)
# ==============================================================================
TARGETS = [
    # --- KATEGORI F&B / CAFE / RESTO / RETAIL ---
    {
        "company": "Rakku Coffee Kotabaru",
        "email": "lifeatrakku@gmail.com",
        "subject": "Lamaran Part Time Crew / Runner / Kasir - Samuel Natanael",
        "type": "fnb"
    },
    {
        "company": "Silol Kopi & Eatery Kotabaru",
        "email": "silolkopi@gmail.com",
        "subject": "Lamaran Part Time Server / Kasir / Runner - Samuel Natanael",
        "type": "fnb"
    },
    {
        "company": "Kalluna Resto Kotabaru",
        "email": "Kallunaresto.hrd@gmail.com",
        "subject": "Lamaran Part Time / Daily Worker Crew - Samuel Natanael",
        "type": "fnb"
    },
    {
        "company": "Legend Coffee Kotabaru",
        "email": "hrdlegendcoffee24@gmail.com",
        "subject": "Lamaran Part Time Crew - Samuel Natanael",
        "type": "fnb"
    },
    {
        "company": "The House of Raminten Kotabaru",
        "email": "ramintenhouse@gmail.com",
        "subject": "Lamaran Part Time / Daily Worker - Samuel Natanael",
        "type": "fnb"
    },
    {
        "company": "Roemi & Manna Kampus (Sagan / Kotabaru)",
        "email": "lamaran.mannakampus@gmail.com",
        "subject": "Lamaran Part Time Crew / Kasir - Samuel Natanael",
        "type": "fnb"
    },
    {
        "company": "Mirota / Manna Kampus HRD",
        "email": "hrd.mirotakampus@gmail.com",
        "subject": "Lamaran Part Time Crew / Kasir - Samuel Natanael",
        "type": "fnb"
    },
    {
        "company": "Couvee Yogyakarta (Area Sagan)",
        "email": "hrd.couvee@gmail.com",
        "subject": "Part Time Crew_Samuel Natanael_Yogyakarta",
        "type": "fnb"
    },
    {
        "company": "Simetri Coffee Roasters Kotabaru",
        "email": "karirsimetricoffee@gmail.com",
        "subject": "Part Time Crew / Server_Yogyakarta",
        "type": "fnb"
    },
    {
        "company": "Tetra Coffee & Eatery Gondokusuman",
        "email": "hrd.tetracoffee@gmail.com",
        "subject": "Part Time Server / Runner_TetraYK",
        "type": "fnb"
    },
    {
        "company": "Space Roastery Yogyakarta",
        "email": "recruitment.spaceroastery@gmail.com",
        "subject": "Samuel Natanael_08989208214",
        "type": "fnb"
    },

    # --- KATEGORI TUTOR / PENGAJAR ---
    {
        "company": "Edufio Yogyakarta",
        "email": "adm@edufio.com",
        "subject": "Samuel Natanael - Tutor Coding / Matematika / Inggris - Part Time Yogyakarta",
        "type": "tutor"
    },
    {
        "company": "Koding Next (Rekrutmen Teacher)",
        "email": "muthia@kodingnext.com",
        "subject": "Part-Time Coding Teacher (Yogyakarta) - Samuel Natanael",
        "type": "tutor"
    },
    {
        "company": "Koding Next",
        "email": "info@kodingnext.com",
        "subject": "Part-Time Coding Teacher (Yogyakarta) - Samuel Natanael",
        "type": "tutor"
    },
    {
        "company": "Timedoor Academy",
        "email": "id@timedooracademy.com",
        "subject": "Part-Time Coding Tutor Application (Yogyakarta) - Samuel Natanael",
        "type": "tutor"
    },
]

def main():
    print("=" * 65)
    print("   AUTO-SENDER LAMARAN PART-TIME SAMUEL NATANAEL (YOGYAKARTA)")
    print("=" * 65)

    # Pastikan file PDF tersedia
    for pdf_file in [PDF_FNB, PDF_TUTOR]:
        if not os.path.exists(pdf_file):
            print(f"[ERROR] File {pdf_file} tidak ditemukan di folder ini!")
            return

    password = APP_PASSWORD.strip()
    if not password:
        print("\nUntuk mengirim email otomatis via Gmail, Anda memerlukan 16-digit 'App Password'.")
        print("Cara ambil (hanya 30 detik):")
        print("1. Buka link ini di browser: https://myaccount.google.com/apppasswords")
        print("2. Ketik nama 'Kirim CV' lalu klik 'Create' / 'Buat'.")
        print("3. Copy 16 huruf yang muncul di kotak kuning.\n")
        password = input("Masukkan 16-digit App Password Gmail Anda di sini: ").strip()

    password = password.replace(" ", "")
    if not password:
        print("[BATAL] App Password kosong.")
        return

    context = ssl.create_default_context()

    print("\nMenghubungkan ke server Gmail...")
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(SENDER_EMAIL, password)
            print("[BERHASIL LOGIN!] Mulai mengirim email lamaran...\n")

            success_count = 0
            for idx, target in enumerate(TARGETS, start=1):
                company = target["company"]
                recipient = target["email"]
                subject = target["subject"]
                job_type = target["type"]

                pdf_path = PDF_FNB if job_type == "fnb" else PDF_TUTOR
                body_text = get_fnb_body(company) if job_type == "fnb" else get_tutor_body(company)

                msg = EmailMessage()
                msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
                msg["To"] = recipient
                msg["Subject"] = subject
                msg.set_content(body_text)

                with open(pdf_path, "rb") as f:
                    file_data = f.read()
                    file_name = os.path.basename(pdf_path)

                msg.add_attachment(
                    file_data,
                    maintype="application",
                    subtype="pdf",
                    filename=file_name
                )

                try:
                    print(f"[{idx}/{len(TARGETS)}] Mengirim ke {company} ({recipient})...")
                    server.send_message(msg)
                    print(f"   -> TERKIRIM! (Lampiran: {file_name})")
                    success_count += 1
                    time.sleep(2)  # Jeda 2 detik agar aman dari filter spam Gmail
                except Exception as e:
                    print(f"   -> [GAGAL] {recipient}: {e}")

            print("\n" + "=" * 65)
            print(f"SELESAI! Berhasil mengirim {success_count} dari {len(TARGETS)} email lamaran.")
            print("Silakan cek folder 'Sent / Terkirim' di Gmail Anda!")
            print("=" * 65)

    except smtplib.SMTPAuthenticationError:
        print("\n[GAGAL LOGIN] App Password salah atau belum memakai Google App Password.")
        print("Pastikan Anda membuat App Password di: https://myaccount.google.com/apppasswords")
    except Exception as e:
        print(f"\n[ERROR] Terjadi kesalahan koneksi: {e}")

if __name__ == "__main__":
    main()
