# 🌾 Dhanlaxmi Foods™

**Dhanlaxmi Foods** - Satara, Maharashtra मधील घरगुती शेवई ब्रँड.  
100% शुद्ध, केमिकल फ्री, दररोज ताज्या बनवलेल्या रवा, गहू आणि मैदा शेवया.

Official Website: `dhanlaxmifoods11.github.io/dhanlaxmi_shevai/`

## Project Overview

हा एक मल्टी-पार्ट वेब प्रोजेक्ट आहे ज्यामध्ये प्रोफेशनल बिझनेस वेबसाइट, ऑर्डर सिस्टम, PWA आणि Admin पॅनल आहे. याचा मुख्य उद्देश ग्राहकांना थेट ऑनलाइन ऑर्डर, किंमत आणि प्रॉडक्ट माहिती देणे हा आहे.

## ✨ Key Features

### Website Features
- **Responsive Design** - मोबाईल आणि डेस्कटॉप दोन्हीसाठी Mobile-First
- **Product Showcase** - 5 प्रकार: रवा, गहू, मैदा, रवा+गहू मिक्स, रवा+मैदा मिक्स
- **Live Price Calculator** - ऑर्डर फॉर्ममध्ये ऑटो किंमत मोजणी + मिक्स रेशो
- **Retail Pricing** - क्लिअर ₹70 आणि ₹90 / किलो किंमत यादी
- **Nutrition Table** - प्रत्येक प्रॉडक्टसाठी 100g पौष्टिक मूल्य
- **Important Notes Box** - MOQ 2kg, Free Delivery, No Return Policy

### Contact & Marketing
- **WhatsApp Order** - एका क्लिकवर WhatsApp ला ऑर्डर Summary जातो
- **Google Sheet Integration** - Apps Script ने ऑर्डर ऑटो सेव्ह
- **Google Review Link** - डायरेक्ट 5-Star Review बटण
- **Google Maps QR** - Footer मध्ये Scan करून Location

### Technical
- **PWA Support** - `manifest.json` + `service worker` - App सारखे Install करता येते
- **SEO Optimized** - Schema Markup, Meta Tags, Alt Text
- **Admin Panel** - `Admin_Panel` फोल्डरमध्ये ऑर्डर मॅनेजमेंट
- **Python Scripts** - `python/` फोल्डरमध्ये Billing आणि Order Automation

## 📦 Products

| प्रॉडक्ट | किंमत | खासियत |
| --- | --- | --- |
| रवा शेवई | ₹70 / किलो | खीर, दूध शेवई. 2 मिनिटात शिजते |
| गहू शेवई | ₹90 / किलो | उपमा, मसाला. जास्त फायबर |
| मैदा शेवई | ₹90 / किलो | नूडल्स, चायनीज स्टाईल |
| रवा + गहू मिक्स | ₹90 / किलो | Health + Taste Combo |
| रवा + मैदा मिक्स | ₹90 / किलो | मऊसर + मुलांना आवडते |

*किमान ऑर्डर: 2kg. सातारा शहरात फ्री होम डिलिव्हरी*

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Font:** Google Fonts - Mukta
- **PWA:** Web App Manifest + Service Worker
- **Backend Integration:** Google Apps Script + Google Sheets
- **Automation:** Python for Billing/Order Processing
- **Hosting:** GitHub Pages

## 📁 Project Structure

```text
Dhanlaxmi Food/
├── dhanlaxmi_shevai/       # Main Website - index.html, style.css, images/
├── Dhanlaxmi_App/          # PWA Version - App style pages
├── Admin_Panel/            # Admin Interface for Orders
├── python/                 # Billing and Order Processing Scripts
├── Photos/                 # Product and Brand Images
├── row code/               # Backup and Old Code
└── Testing Code/           # Experimental Features
