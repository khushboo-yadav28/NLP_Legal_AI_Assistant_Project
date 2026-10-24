// src/services/documentService.ts

export type SupportedDocumentType =
  | 'name_change'
  | 'address_change'
  | 'dob_correction'
  | 'relation_update'
  | 'one_and_same';

export interface AffidavitPayload {
  document_type?: SupportedDocumentType | string;
  full_name?: string;
  old_value?: string;
  new_value?: string;
  old_name?: string;
  new_name?: string;
  father_or_spouse_name?: string;
  father_name?: string;
  age?: number | string;
  address?: string;
  city?: string;
  state?: string;
}

/**
 * Identifies the specific document type from user query or assistant message text.
 * Maps 'date of birth' / 'DoB' queries to 'dob_correction',
 * address queries to 'address_change', and name/spelling queries to 'name_change'.
 */
export function getAffidavitDocType(text: string): SupportedDocumentType {
  if (!text) return 'name_change';
  const lower = text.toLowerCase();

  // 1. Date of Birth / DoB queries
  if (
    lower.includes('date of birth') ||
    lower.includes('birth date') ||
    lower.includes('birth certificate') ||
    lower.includes('born on') ||
    lower.includes('correction of dob') ||
    lower.includes('dob correction') ||
    lower.includes('change dob') ||
    lower.includes('update dob') ||
    /\b(dob|d\.o\.b\.?)\b/i.test(text)
  ) {
    return 'dob_correction';
  }

  // 2. One and the same person
  if (
    lower.includes('one and the same') ||
    lower.includes('one and same') ||
    lower.includes('same person') ||
    lower.includes('alias') ||
    lower.includes('name variation') ||
    lower.includes('singular identity')
  ) {
    return 'one_and_same';
  }

  // 3. Relation / Parent / Spouse update
  if (
    lower.includes('relation update') ||
    lower.includes('father name') ||
    lower.includes("father's name") ||
    lower.includes('mother name') ||
    lower.includes("mother's name") ||
    lower.includes('spouse name') ||
    lower.includes("spouse's name") ||
    lower.includes('parent name')
  ) {
    return 'relation_update';
  }

  // 4. Address change / Proof of residence
  if (
    lower.includes('address change') ||
    lower.includes('change of address') ||
    lower.includes('proof of residence') ||
    lower.includes('residence proof') ||
    lower.includes('residential address') ||
    lower.includes('shifted residence') ||
    lower.includes('new address') ||
    lower.includes('old address') ||
    lower.includes('address correction') ||
    /\b(address|residence|relocation)\b/i.test(text)
  ) {
    return 'address_change';
  }

  // 5. Default: Name change / spelling
  return 'name_change';
}

/**
 * Checks whether an assistant message represents or contains a legal affidavit response
 * across supported legal scenarios.
 */
export function isAffidavitMessage(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();

  if (!lower.includes('affidavit')) return false;

  return (
    lower.includes('name change') ||
    lower.includes('change of name') ||
    lower.includes('spelling correction') ||
    lower.includes('address change') ||
    lower.includes('change of address') ||
    lower.includes('proof of residence') ||
    lower.includes('date of birth') ||
    lower.includes('birth date') ||
    /\b(dob|d\.o\.b\.?)\b/i.test(text) ||
    lower.includes('father') ||
    lower.includes('spouse') ||
    lower.includes('relation') ||
    lower.includes('one and the same') ||
    lower.includes('one and same') ||
    lower.includes('same person') ||
    lower.includes('deponent') ||
    lower.includes('solemnly affirm') ||
    lower.includes('on oath') ||
    lower.includes('notary') ||
    lower.includes('verification') ||
    lower.includes('stamp paper')
  );
}

/**
 * Extracts structured affidavit fields from an assistant message or markdown text.
 * Dynamically resolves parameters for name_change, address_change, and dob_correction.
 */
export function extractAffidavitDetails(text: string, defaultName?: string): AffidavitPayload {
  const docType = getAffidavitDocType(text);

  const result: AffidavitPayload = {
    document_type: docType,
    full_name: '',
    old_value: '',
    new_value: '',
    old_name: '',
    new_name: '',
    father_or_spouse_name: '',
    age: '',
    address: '',
    city: '',
    state: '',
  };

  if (!text) return result;

  // 1. Deponent Current/Full Name
  const deponentMatch =
    text.match(/I,\s*[*_]*([A-Za-z\s\.]+?)[*_]*,\s*(?:Son|Daughter|Spouse|S\/o|D\/o|W\/o)/i) ||
    text.match(/(?:recorded in|recorded as)\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*\s*(?:\.|\s|,|in)/i) ||
    text.match(/(?:Current Name|Old Name|Former Name|Deponent Name|Full Name)\s*:\s*[*_]*([A-Za-z\s\.]+?)[*_]*(?:\n|,|$)/i);

  if (deponentMatch && deponentMatch[1]) {
    const raw = deponentMatch[1].trim();
    if (!raw.includes('[') && raw.length > 2) {
      result.full_name = raw;
    }
  }

  // 2. Father or Spouse Name
  const fatherMatch =
    text.match(/(?:Son|Daughter|Spouse|S\/o|D\/o|W\/o)\s*(?:of)?\s*[*_]*([A-Za-z\s\.]+?)[*_]*,\s*aged/i) ||
    text.match(/(?:Father's Name|Spouse Name|Father)\s*:\s*[*_]*([A-Za-z\s\.]+?)[*_]*(?:\n|,|$)/i);

  if (fatherMatch && fatherMatch[1]) {
    const raw = fatherMatch[1].trim();
    if (!raw.includes('[') && raw.length > 2) {
      result.father_or_spouse_name = raw;
    }
  }

  // 3. Age
  const ageMatch =
    text.match(/aged\s*(?:about)?\s*[*_]*(\d+)[*_]*\s*years/i) ||
    text.match(/(?:Age)\s*:\s*[*_]*(\d+)[*_]*/i);

  if (ageMatch && ageMatch[1]) {
    result.age = parseInt(ageMatch[1], 10);
  }

  // 4. City & State (general location search)
  const cityStateMatch =
    text.match(/Verified at\s*[*_]*([A-Za-z\s]+?)[*_]*,\s*[*_]*([A-Za-z\s]+?)[*_]*\s*on/i) ||
    text.match(/(?:City)\s*:\s*[*_]*([A-Za-z\s]+?)[*_]*(?:\n|,|$)/i);

  if (cityStateMatch && cityStateMatch[1]) {
    result.city = cityStateMatch[1].trim();
    if (cityStateMatch[2]) {
      result.state = cityStateMatch[2].trim();
    }
  }

  // 5. Address (if present in preamble)
  const addrMatch =
    text.match(/residing at\s*[*_]*([\s\S]+?)[*_]*,\s*do hereby/i) ||
    text.match(/(?:Address|Residence)\s*:\s*[*_]*([^\n]+?)[*_]*(?:\n|$)/i);

  if (addrMatch && addrMatch[1]) {
    const rawAddr = addrMatch[1].trim();
    if (!rawAddr.includes('[') && rawAddr.length > 3) {
      result.address = rawAddr;
      const parts = rawAddr.split(',').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        if (!result.state) result.state = parts[parts.length - 1];
        if (!result.city) result.city = parts[parts.length - 2];
      }
    }
  }

  // 6. Type-Specific Extraction
  if (docType === 'dob_correction') {
    // Look for date patterns (e.g. DD/MM/YYYY, DD-MM-YYYY, or Month DD, YYYY)
    const dobMatch =
      text.match(/from\s*["“'*_]*(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})["”'*_]*\s*to\s*["“'*_]*(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})["”'*_]*/i) ||
      text.match(/(?:incorrect|erroneous|recorded)\s*(?:dob|date of birth)[:\s]*["“'*_]*(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})["”'*_]*/i);

    if (dobMatch && dobMatch[1]) {
      result.old_value = dobMatch[1].trim();
      if (dobMatch[2]) {
        result.new_value = dobMatch[2].trim();
      }
    }

    if (!result.new_value) {
      const correctMatch = text.match(/(?:actual|correct|true)\s*(?:dob|date of birth)[:\s]*["“'*_]*(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})["”'*_]*/i);
      if (correctMatch && correctMatch[1]) {
        result.new_value = correctMatch[1].trim();
      }
    }
  } else if (docType === 'address_change') {
    const oldAddrMatch =
      text.match(/(?:previously residing at|earlier address|previous address)\s*[:\s]*["“'*_]*([^\n"”]+?)["”'*_]*(?:\.|\n|,|where)/i) ||
      text.match(/from\s*["“'*_]*([^\n"”]+?)["”'*_]*\s*to/i);

    if (oldAddrMatch && oldAddrMatch[1] && !oldAddrMatch[1].includes('[')) {
      result.old_value = oldAddrMatch[1].trim();
    }

    const newAddrMatch =
      text.match(/(?:currently residing at|shifted to|new address|present address)\s*[:\s]*["“'*_]*([^\n"”]+?)["”'*_]*(?:\.|\n|,|where|do hereby)/i) ||
      text.match(/to\s*["“'*_]*([^\n"”]+?)["”'*_]*(?:\.|\n|,|$)/i);

    if (newAddrMatch && newAddrMatch[1] && !newAddrMatch[1].includes('[')) {
      result.new_value = newAddrMatch[1].trim();
      result.address = result.new_value;
    }
  } else if (docType === 'relation_update') {
    const relMatch =
      text.match(/recorded as\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*,\s*whereas the true.*?name is\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*/i) ||
      text.match(/from\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*\s*to\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*/i);

    if (relMatch && relMatch[1] && !relMatch[1].includes('[')) {
      result.old_value = relMatch[1].trim();
      if (relMatch[2] && !relMatch[2].includes('[')) {
        result.new_value = relMatch[2].trim();
      }
    }
  } else if (docType === 'one_and_same') {
    const sameMatch =
      text.match(/(?:variations|specifically as)\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*\s*and\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*/i) ||
      text.match(/names\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*\s*and\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*\s*refer/i);

    if (sameMatch && sameMatch[1] && !sameMatch[1].includes('[')) {
      result.old_value = sameMatch[1].trim();
      if (sameMatch[2] && !sameMatch[2].includes('[')) {
        result.new_value = sameMatch[2].trim();
      }
    }
  } else {
    // name_change
    const newNameMatch =
      text.match(/from\s*["“'*_]*[A-Za-z\s\.]+?["”'*_]*\s*to\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*(?:\.|\s|,|$)/i) ||
      text.match(/(?:New Name|solely as|addressed as)\s*[:\s]*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*(?:\.|\s|,|\n|$)/i) ||
      text.match(/affidavit for\s*[*_]*([A-Za-z\s\.]+?)[*_]*\s*(?:has been|is)/i);

    if (newNameMatch && newNameMatch[1] && !newNameMatch[1].includes('[')) {
      result.new_name = newNameMatch[1].trim();
      result.new_value = newNameMatch[1].trim();
    }
    result.old_value = result.full_name;
    result.old_name = result.full_name;
  }

  // Fallbacks using defaultName if available
  if (!result.full_name && defaultName) {
    result.full_name = defaultName;
  }
  if (!result.full_name) {
    result.full_name = 'Deponent Full Name';
  }

  return result;
}

/**
 * Sends user details to the backend affidavit document generation endpoint
 * and automatically triggers a browser download for the .docx file without leaving the page.
 */
export async function generateAndDownloadAffidavit(payload: AffidavitPayload): Promise<{ filename: string }> {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const token = localStorage.getItem('legal_ai_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/documents/generate-affidavit`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = 'Failed to generate affidavit document.';
    try {
      const errData = await response.json();
      if (errData?.detail) {
        errorDetail = errData.detail;
      }
    } catch {
      // response might not be JSON
    }
    throw new Error(errorDetail);
  }

  // Retrieve Word document blob from response
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  // Extract filename from Content-Disposition header if present, or create a sensible fallback
  const prefixMap: Record<string, string> = {
    dob_correction: 'DOB_Correction',
    relation_update: 'Relation_Update',
    one_and_same: 'One_And_Same_Person',
    address_change: 'Address_Change',
    name_change: 'Name_Change',
  };
  const docTypePrefix = prefixMap[payload.document_type || 'name_change'] || 'Legal';
  const targetName = (payload.new_value || payload.new_name || payload.full_name || 'document').trim();
  let filename = `Affidavit_${docTypePrefix}_${targetName.replace(/\s+/g, '_')}.docx`;

  const contentDisposition = response.headers.get('content-disposition');
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename=["']?([^"';]+)["']?/i);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].trim();
    }
  }

  // Trigger browser download without navigating away
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return { filename };
}
