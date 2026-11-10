# Pravidla pro úpravy webu panelcz.cz

Popis struktury je v README.md. Navíc:

- Oficiální název je **Panelcz**, adresa **Oslnovice ev. č. 51, osada Chmelnice, 671 07 Uherčice** (potvrdil David 10. 11. 2026). Všude jen Panelcz, i v hovorových spojeních („celý Panelcz“, „Akce na Panelcz“), potvrdil David 10. 11. 2026.
- Administraci `/admin/` (Decap CMS) nerozbij: každé nové pole v `content/*.json` musí být i v `admin/config.yml` (nepovinná pole s `required: false`).
- Texty stránek jsou ve třech jazycích (CZ/DE/EN), změnu dělej ve všech.
- Nic nevymýšlej: ceny, časy, vybavení v `src/seo.json` i v popisech musí odpovídat textům na webu.
- Fotky na pozadí v obsahu piš jako `style="background-image:url('{{foto:kod}}')"`, `build.js` je sám převede na pozdní načítání. Nepiš do HTML ručně `/foto/m/`.
- Ověření: `node build.js`, pak web z `dist/` v prohlížeči na šířce telefonu i počítače. Push do `main` web sám nahraje na Wedos.
