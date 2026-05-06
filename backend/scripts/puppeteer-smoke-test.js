const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function run() {
  const templatePath = path.join(
    __dirname,
    '..',
    'src',
    'service-orders',
    'templates',
    'os-template.html',
  );

  let html = fs.readFileSync(templatePath, 'utf8');

  const data = {
    companyName: 'SygmaAuto Teste',
    companyAddress: 'Rua Teste, 123',
    companyPhone: '(11) 99999-9999',
    companyEmail: 'teste@sygmaauto.com',
    companyCNPJ: '00.000.000/0001-00',
    customerName: 'Cliente Teste',
    customerDocument: '123.456.789-00',
    customerPhone: '(11) 98888-7777',
    customerAddress: 'Av. Cliente, 456',
    osNumber: 'TESTE001',
    osDate: '06/05/2026',
    osStatus: 'ORCAMENTO',
    vehicleBrand: 'VOLVO',
    vehicleModel: 'XC60',
    vehicleYear: '2020',
    vehiclePlate: 'ABC1D23',
    vehicleVIN: 'VIN123456789',
    vehicleKM: '120000',
    complaint: 'Ruido no motor',
    diagnosis: 'Necessaria troca de componentes.',
    observations: 'Teste automatizado',
    servicesRows:
      '<tr><td>1</td><td>Diagnostico</td><td class="col-qty">1</td><td class="col-price">R$ 150,00</td><td class="col-total">R$ 150,00</td></tr>',
    productsRows:
      '<tr><td>1</td><td>Filtro</td><td class="col-qty">1</td><td class="col-price">R$ 80,00</td><td class="col-total">R$ 80,00</td></tr>',
    totalServices: 'R$ 150,00',
    totalProducts: 'R$ 80,00',
    subtotal: 'R$ 230,00',
    totalDiscount: 'R$ 0,00',
    total: 'R$ 230,00',
  };

  Object.entries(data).forEach(([k, v]) => {
    html = html.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
  });

  html = html
    .replace(/{{#if observations}}/g, '')
    .replace(/{{\/if}}/g, '')
    .replace(/{{.*?}}/g, '');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle2' });

  const outputPath = path.join(__dirname, '..', '..', 'os_test_puppeteer.pdf');

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0.5in',
      right: '0.5in',
      bottom: '0.5in',
      left: '0.5in',
    },
  });

  await browser.close();
  console.log(`OK_PUPPETEER:${outputPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
