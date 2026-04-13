const puppeteer = require('puppeteer');

(async () => {
  console.log('Odpalam robota...');
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 3000 });

  const url = 'https://auth.assecobs.com/login?service=https%3A%2F%2Fdgs-erpcloud.assecobs.pl%2FDGS_HTML_PROD%2F_2000_HtmlLoginPage.aspx%3FDBC%3DPORTAL'; 
  console.log(`Wchodzę na: ${url}`);
  await page.goto(url);

  // Czekamy chwilę, żeby strona na pewno w pełni się wczytała
  await new Promise(r => setTimeout(r, 2000)); 

  console.log('Wpisuję dane logowania...');
  
  // 1. WPISYWANIE LOGINU
  // Zastąp #id_pola_login tym, co znalazłeś. Jeśli to było id="username", wpisz tu '#username' (z hashem!)
  await page.type('#username', process.env.ASSECO_LOGIN);
  
  // 2. WPISYWANIE HASŁA
  // Zastąp #id_pola_haslo selektorem hasła
  await page.type('#password', process.env.ASSECO_PASSWORD); 

  console.log('Klikam Zaloguj i czekam na załadowanie systemu...');
  
  // 3. KLIKANIE PRZYCISKU
  // Promise.all sprawia, że bot klika i JEDNOCZEŚNIE zaczyna czekać, aż nowa strona przestanie się ładować
  await Promise.all([
    page.waitForNavigation(), 
    page.click('button[type="submit"]')
  ]);

  console.log('Udało się! Robię zrzut ekranu pulpitu Asseco...');
  // Jeśli wszystko zadziała, zobaczysz screena z wnętrza systemu!
  await page.screenshot({ path: 'po_zalogowaniu.png' });

  // ... (poprzedni kod logowania) ...

  console.log('Szukam zakładki "Karta Pracy pracownika"...');
  
  // 1. Czekamy, aż przycisk menu w ogóle załaduje się w kodzie strony
  const selektorMenu = 'a[sl-name="MI_143270"]';
  await page.waitForSelector(selektorMenu);

  console.log('Znalazłem! Przechodzę do grafiku...');

  // 2. Wykonujemy kliknięcie i czekamy na przeładowanie strony
  await Promise.all([
    page.waitForNavigation(), 
    page.evaluate((selektor) => {
      document.querySelector(selektor).click();
    }, selektorMenu)
  ]);

  console.log('Wszedłem na stronę grafiku. Czekam 5 sekund na załadowanie danych z serwera...');
  
  // Wymuszamy 5 sekund pauzy (5000 milisekund). 
  // Jeśli Twój system działa wolniej, możesz zwiększyć tę wartość np. do 8000.
  console.log('Wszedłem na stronę grafiku. Czekam 5 sekund na załadowanie danych z serwera...');
  await new Promise(r => setTimeout(r, 5000)); 

  console.log('Wyciągam dane z tabeli...');

  // Bot "wchodzi" w kod strony i czyta tabelkę
  const mojGrafik = await page.evaluate(() => {
    // Pobieramy wszystkie wiersze tabeli (tagi <tr>)
    const wiersze = Array.from(document.querySelectorAll('tr'));

    const wyciagnieteDane = wiersze.map(wiersz => {
      // Szukamy naszych komórek po atrybutach data-field
      const data = wiersz.querySelector('td[data-field="DATANAZWA"]')?.innerText?.trim();
      const godzinaOd = wiersz.querySelector('td[data-field="GODZOD"]')?.innerText?.trim();
      const godzinaDo = wiersz.querySelector('td[data-field="GODZDO"]')?.innerText?.trim();

      return {
        data: data,
        od: godzinaOd,
        do: godzinaDo
      };
    });

    // Zwracamy tylko te wiersze, które faktycznie mają datę (odrzucamy nagłówki tabeli i puste pola)
    return wyciagnieteDane.filter(dzien => dzien.data && dzien.data !== '');
  });

  console.log('Udało się! Oto Twój grafik (podgląd pierwszych 5 dni):');
  console.log(mojGrafik.slice(0, 5)); // Wyświetlamy tylko początek, żeby nie zaspamować konsoli

  // ZAPIS DO PLIKU
  // Importujemy moduł 'fs' i zapisujemy nasz grafik do pliku moj_grafik.json
  const fs = require('fs');
  fs.writeFileSync('moj_grafik.json', JSON.stringify(mojGrafik, null, 2));
  
  console.log('Sukces! Cały grafik został zapisany do pliku moj_grafik.json.');

  console.log('Zamykam przeglądarkę.');
  await browser.close();
})();

