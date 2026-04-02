import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const STANDARD_URL = "https://ws.sanmar.com:8080/SanMarWebService/SanMarProductInfoServicePort";

function getCredentials() {
  return {
    username: Deno.env.get("SANMAR_USERNAME"),
    password: Deno.env.get("SANMAR_PASSWORD"),
    customerNumber: Deno.env.get("SANMAR_CUSTOMER_NUMBER"),
  };
}

function buildByStyleEnvelope(style) {
  const { username, password, customerNumber } = getCredentials();
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:impl="http://impl.webservice.integration.sanmar.com/">
  <soapenv:Header/>
  <soapenv:Body>
    <impl:getProductInfoByStyleColorSize>
      <arg0><style>${style}</style></arg0>
      <arg1>
        <sanMarCustomerNumber>${customerNumber}</sanMarCustomerNumber>
        <sanMarUserName>${username}</sanMarUserName>
        <sanMarUserPassword>${password}</sanMarUserPassword>
      </arg1>
    </impl:getProductInfoByStyleColorSize>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildByBrandEnvelope(brand) {
  const { username, password, customerNumber } = getCredentials();
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:impl="http://impl.webservice.integration.sanmar.com/">
  <soapenv:Header/>
  <soapenv:Body>
    <impl:getProductInfoByBrand>
      <arg0><brandName>${escapeXml(brand)}</brandName></arg0>
      <arg1>
        <sanMarCustomerNumber>${customerNumber}</sanMarCustomerNumber>
        <sanMarUserName>${username}</sanMarUserName>
        <sanMarUserPassword>${password}</sanMarUserPassword>
      </arg1>
    </impl:getProductInfoByBrand>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function extractTagValue(text, tag, start = 0) {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const si = text.indexOf(open, start);
  if (si === -1) return '';
  const ci = text.indexOf(close, si);
  if (ci === -1) return '';
  return text.substring(si + open.length, ci).trim();
}

function extractBlocks(text, tag) {
  const blocks = [];
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  let pos = 0;
  while (true) {
    const si = text.indexOf(open, pos);
    if (si === -1) break;
    const ei = text.indexOf(close, si);
    if (ei === -1) break;
    blocks.push(text.substring(si + open.length, ei));
    pos = ei + close.length;
  }
  return blocks;
}

// Parse listResponse blocks into color/image objects
function parseListResponses(xmlText) {
  if (xmlText.includes('<errorOccured>true</errorOccured>') || xmlText.includes('<errorOccurred>true</errorOccurred>')) {
    return [];
  }

  const colorMap = new Map();
  const listBlocks = extractBlocks(xmlText, 'listResponse');

  for (const block of listBlocks) {
    const basicInfo = extractBlocks(block, 'productBasicInfo')[0] || '';
    const imageInfo = extractBlocks(block, 'productImageInfo')[0] || '';

    const catalogColor = extractTagValue(basicInfo, 'catalogColor');
    const style = extractTagValue(basicInfo, 'style');
    const brandName = extractTagValue(basicInfo, 'brandName');
    const productTitle = extractTagValue(basicInfo, 'productTitle');
    const brandLogoImage = extractTagValue(imageInfo, 'brandLogoImage');

    if (!catalogColor) continue;

    const colorKey = `${style}__${catalogColor}`;
    if (!colorMap.has(colorKey)) {
      const frontModel = extractTagValue(imageInfo, 'frontModel');
      const backModel = extractTagValue(imageInfo, 'backModel');
      const sideModel = extractTagValue(imageInfo, 'sideModel');
      const colorProductImage = extractTagValue(imageInfo, 'colorProductImage');
      const colorSwatchImage = extractTagValue(imageInfo, 'colorSwatchImage');
      const colorSquareImage = extractTagValue(imageInfo, 'colorSquareImage');
      const productImage = extractTagValue(imageInfo, 'productImage');

      colorMap.set(colorKey, {
        colorName: catalogColor,
        colorCode: '',
        colorSwatch: colorSquareImage || colorSwatchImage || '',
        style,
        brandName,
        productTitle,
        brandLogoImage,
        images: {
          Front: frontModel || colorProductImage || productImage || '',
          Back: backModel || '',
          'Left Sleeve': sideModel || '',
          'Right Sleeve': sideModel || '',
        }
      });
    }
  }

  return Array.from(colorMap.values());
}

// Get unique styles from a brand's listResponse blocks
function parseStylesFromBrand(xmlText) {
  if (xmlText.includes('<errorOccured>true</errorOccured>')) return [];

  const styleMap = new Map();
  const listBlocks = extractBlocks(xmlText, 'listResponse');

  for (const block of listBlocks) {
    const basicInfo = extractBlocks(block, 'productBasicInfo')[0] || '';
    const imageInfo = extractBlocks(block, 'productImageInfo')[0] || '';

    const style = extractTagValue(basicInfo, 'style');
    const productTitle = extractTagValue(basicInfo, 'productTitle');
    const brandName = extractTagValue(basicInfo, 'brandName');
    const brandLogoImage = extractTagValue(imageInfo, 'brandLogoImage');
    const productImage = extractTagValue(imageInfo, 'productImage');
    const colorProductImage = extractTagValue(imageInfo, 'colorProductImage');
    const frontModel = extractTagValue(imageInfo, 'frontModel');
    const colorSwatchImage = extractTagValue(imageInfo, 'colorSwatchImage');

    if (!style || styleMap.has(style)) continue;

    styleMap.set(style, {
      style,
      productTitle,
      brandName,
      brandLogoImage,
      image: frontModel || colorProductImage || productImage || '',
      colorSwatch: colorSwatchImage || '',
    });
  }

  return Array.from(styleMap.values());
}

const TIMEOUT_MS = 25000;

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function soapPost(body) {
  return fetchWithTimeout(STANDARD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      'SOAPAction': '',
    },
    body,
  }).then(r => r.text());
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, styleNumber, brandName } = body;

  // Action: get styles for a brand
  if (action === 'getStylesByBrand') {
    if (!brandName) return Response.json({ error: 'brandName is required' }, { status: 400 });
    const xmlText = await soapPost(buildByBrandEnvelope(brandName));
    if (xmlText.includes('<faultstring>')) {
      const fault = extractTagValue(xmlText, 'faultstring');
      return Response.json({ styles: [], error: fault });
    }
    const styles = parseStylesFromBrand(xmlText);
    return Response.json({ styles, brandName });
  }

  // Default: get colors/images for a style
  if (!styleNumber) return Response.json({ error: 'styleNumber is required' }, { status: 400 });

  const style = styleNumber.toUpperCase().trim();
  const xmlText = await soapPost(buildByStyleEnvelope(style));

  if (xmlText.includes('<faultstring>')) {
    const fault = extractTagValue(xmlText, 'faultstring');
    return Response.json({ products: [], styleNumber: style, error: fault });
  }

  const products = parseListResponses(xmlText);
  return Response.json({ products, styleNumber: style, count: products.length });
});