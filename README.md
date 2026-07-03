# Takım İsmi
# 👥 Takım 102

# Takım Üyelerimiz
| Fotoğraf       | İsim         | Rol               | LinkedIn Hesabı                                          |
| -------------- | ------------ | ----------------- | -------------------------------------------------------- |
| | Eylül Kalfa | Product Owner & Developer  | eylulkalfa](https://www.linkedin.com/in/eylulkalfa/)  |
| | Esra Eda Kılıç   | Scrum Master & Developer  | [esraedakılıç](https://www.linkedin.com/in/esraedak%C4%B1l%C4%B1%C3%A7/)     |
| | Yiğit Emre Demiral    | Developer         | [yiğitemredemiral](https://www.linkedin.com/in/yi%C4%9Fitemredemiral/)    |
| | Serhat Erdoğan   | Developer| Gelecek   |

# Ürün İsmi
<div align="center">

# 💊 PharmaGuard

### AI-Powered Smart Medication & Treatment Management Platform

</div>

# Ürün Açıklaması
**PharmaGuard**, kullanıcıların ilaç kullanım süreçlerini daha güvenli, düzenli ve kolay yönetmelerini sağlayan yapay zekâ destekli bir ilaç ve tedavi yönetim platformudur. 
Uygulama; ilaçların manuel olarak eklenmesini, reçete fotoğraflarından OCR teknolojisi ile ilaç bilgilerinin okunmasını, günlük ilaç takibinin yapılmasını ve yapay zekâ tarafından prospektüs bilgilerinin sade bir dille özetlenmesini sağlar. 
Ayrıca kullanıcılar, ilaç kullanım geçmişlerini takip edebilir ve doktor kontrolleri öncesinde haftalık tedavi raporlarını PDF formatında oluşturabilir.

# Ürünün Amacı
**PharmaGuard**, kronik hastalar, yaşlı bireyler ve düzenli ilaç kullanan kişilerin ilaç kullanım süreçlerini daha güvenli, düzenli ve takip edilebilir hale getirmeyi amaçlamaktadır. Kullanıcıların ilaçlarını zamanında kullanmalarını desteklerken, reçete ve prospektüs bilgilerinin anlaşılmasını kolaylaştırır ve yapay zekâ destekli analizlerle tedavi sürecini daha verimli yönetmelerine yardımcı olur. Ayrıca doktor kontrolleri öncesinde düzenli tedavi raporları oluşturarak hasta ve sağlık profesyonelleri arasındaki iletişimi güçlendirmeyi hedefler.

# Ürünün Özellikleri
* **Manuel İlaç Yönetimi:** Kullanıcılar ilaçlarını kolayca sisteme ekleyebilir, düzenleyebilir ve günlük kullanım planlarını oluşturabilir.

* **OCR Destekli Reçete Okuma:** Reçete fotoğrafları Tesseract OCR teknolojisi ile analiz edilerek ilaç isimleri otomatik olarak sisteme aktarılır.

* **Yapay Zekâ Destekli Prospektüs Özeti:** Gemini API ile ilaç prospektüsleri sade ve anlaşılır bir dille özetlenerek kullanıcıların ilaçlarını daha bilinçli kullanmaları desteklenir.

* **Günlük İlaç Takibi:** Kullanıcılar ilaçlarını alındı/alınmadı olarak işaretleyebilir ve günlük tedavi süreçlerini düzenli şekilde takip edebilir.

* **Akıllı İlaç Analizi:** Aynı etken maddeye sahip ilaçlar tespit edilerek kullanıcıya bilgilendirici uyarılar sunulur.

* **Haftalık Tedavi Raporu:** Kullanıcının ilaç kullanım geçmişi analiz edilerek doktor kontrollerinde kullanılabilecek PDF formatında haftalık rapor oluşturulur.

* **Kullanıcı Dostu Dashboard:** İlaç kullanım oranı, günlük görevler ve tedavi süreci tek bir ekranda görselleştirilerek kullanıcıya sunulur.

# Hedef Kitle
* Kronik hastalığı nedeniyle düzenli ilaç kullanan bireyler
* Birden fazla ilaç kullanan kullanıcılar
* Yaşlı bireyler ve bakımını üstlenen yakınları
* Düzenli tedavi süreci gerektiren hastalar
* İlaç kullanımını düzenli takip etmek isteyen herkes

# Kullanılacak Teknolojiler
* Frontend: React.js, Tailwind CSS
* Backend: FastAPI
* Veritabanı: PostgreSQL
* Yapay Zekâ: Gemini API
* OCR (Optik Karakter Tanıma): Tesseract OCR
* PDF Oluşturma: ReportLab
* API Testi: Postman
* Sürüm Kontrolü: Git & GitHub
* Dağıtım (Deployment): Vercel (Frontend), Render (Backend)

# Product Backlog URL
Proje planlama, görev takibi ve sprint yönetimi süreçlerimizi Trello üzerinden yürütmekteyiz.

[PharmaGuard Trello Backlog Board](BURAYA_TRELLO_LINKI_GELECEK)

![Sprint Board](BURAYA_SPRINT_BOARD_EKRAN_GORUNTUSU_GELECEK)



# Sprint 1 Raporu

Sprint Notları: Sprint sürecine başlamadan önce Trello üzerinde oluşturduğumuz product backlog, üç sprintlik iş yükünü kapsayacak şekilde önceden planlanmıştır. Bu sayede, projenin genel yol haritası netleşmiş ve uzun vadeli hedeflere daha stratejik bir şekilde yaklaşılabilmiştir.

* Daily Scrum Raporları: Proje kapsamında iletişim ve koordinasyonun sağlanabilmesi amacıyla düzenli olarak Whatsapp ve Google Meet platformları üzerinden toplantılar gerçekleştirilmiştir. Takım içi rol dağılımı, önceki formlarda belirtildiği üzere, net bir şekilde belirlenmiştir. Kutay, proje boyunca Product Owner olarak görev almakta; projenin genel vizyonunu belirleme, gereksinimleri toplama ve ekipler arası koordinasyonu sağlama sorumluluğunu üstlenmektedir. Damla ise Scrum Master rolünü üstlenerek, takımın Scrum süreçlerine uygun şekilde çalışmasını, engellerin hızlıca aşılmasını ve takım içi iletişimin etkin bir şekilde yürütülmesini sağlamaktadır.Proje görev dağılımı çerçevesinde iki ana ekip oluşturulmuştur:

* Backend ve Veritabanı Ekibi: Bedirhan ve Sare’den oluşan bu ekip, projenin veritabanı tasarımı ve backend geliştirme süreçlerinden sorumludur. Veritabanı yapısının oluşturulması, API geliştirme ve sunucu tarafı işlemler bu ekibin ana görev alanlarını oluşturmaktadır.
* Frontend Ekibi: Kerem ve Damla’dan oluşan bu ekip ise, kullanıcı arayüzü tasarımı ve geliştirilmesi, kullanıcı deneyimi (UX) ve uygulamanın görsel bileşenlerinin kodlanmasından sorumludur.
Product Owner olan Kutay, her iki ekiple de yakın bir şekilde çalışarak, ihtiyaç duyulan her noktada destek sağlamakta ve ekipler arasında bilgi akışını koordine etmektedir. Böylece, projenin tüm aşamalarında bütüncül bir yaklaşım benimsenmiş ve ekipler arası iş birliği en üst düzeyde tutulmuştur.

Sprint Board Updates: Sprint sürecinin şeffaf ve verimli bir şekilde yönetilebilmesi amacıyla, tüm görevler ve iş akışları Trello üzerinde oluşturulan Sprint Board üzerinden takip edilmiştir. Sprint Board, projenin mevcut durumunu ve ilerleyişini anlık olarak görmemizi sağlamış, ekip üyeleri arasında görev paylaşımını ve sorumlulukların netleşmesini kolaylaştırmıştır. Görevler, her sprint için öngörülen puan sınırını aşmayacak biçimde dağıtılmıştır.

## Sprint 1 Daily Scrum Meets
Sürecin büyük kısmını Google Meet üzerinde neredeyse her gün meeting gerçekleştirerek yaptık.

[Daily Scrum Meets](https://docs.google.com/document/d/14dpRRWSR0RTtUQu9QqKADDhbIHwv9LhxXnHE21a-tqw/edit?usp=sharing)

## Sprint Review
* Tüm ekip üyeleri sprint süresince gerçekleştirilen toplantılara eksiksiz katılım sağladı. Proje ve proje gereksinimleri ekipçe kapsamlı bir şekilde gözden geçirildi. Sonraki sprintlerde gerçekleştirilecek görevler belirlendi ve bu görevlerin ekip üyeleri arasında dengeli bir şekilde dağıtılması sağlandı.

## Sprint Retrospective
Güçlü Yönlerimiz
* Etkili bir ekip çalışması yürüttük; ekip içerisinde mikro ekipler oluşturarak iletişimi dinamik ve sürdürülebilir kıldık.

* Sürecin başında detaylı bir analiz yaparak sağlam bir planlama gerçekleştirdik.

* Projeye yenilikçi fikirler entegre etmek konusunda cesur davrandık ve ekip ruhunu başarıyla pekiştirdik.

Geliştirilmesi Gereken Yönlerimiz

* Teknik bilgi eksikliklerimizi gidermek için bireysel ve ekip içi gelişim çalışmalarına ağırlık vermeliyiz.

* Zaman yönetimi konusunda daha disiplinli ve verimli bir yaklaşım benimsememiz gerekmektedir.

# Sprint 2 


