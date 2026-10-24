// src/services/documentService.ts

export type SupportedDocumentType =
  | 'surname_change'
  | 'name_change'
  | 'address_change'
  | 'dob_correction'
  | 'relation_update'
  | 'one_and_same';

export interface AffidavitPayload {
  document_type?: SupportedDocumentType | string;
  query?: string;
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
 * Checks whether an incoming user query is requesting an affidavit or downloadable document.
 * Returns false for standard RAG / legal informational questions (Consumer Protection, RTI, Contract law).
 */
export function isDocumentGenerationQuery(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();

  // Strong positive markers
  const hasDocMarker =
    lower.includes('affidavit') ||
    lower.includes('.docx') ||
    lower.includes('word document') ||
    lower.includes('word format') ||
    lower.includes('word file') ||
    lower.includes('downloadable') ||
    lower.includes('draft') ||
    lower.includes('generate the document') ||
    lower.includes('provide the document') ||
    lower.includes('correction document') ||
    lower.includes('change surname') ||
    lower.includes('surname change') ||
    lower.includes('change name') ||
    lower.includes('name change') ||
    lower.includes('spelling correction');

  if (!hasDocMarker) return false;

  // If query is purely conceptual and doesn't ask for a file/draft/affidavit
  const isPureQuestion =
    (lower.startsWith('what are') || lower.startsWith('what is') || lower.startsWith('how can i file an rti') || lower.startsWith('what constitutes')) &&
    !lower.includes('affidavit') &&
    !lower.includes('.docx') &&
    !lower.includes('word document') &&
    !lower.includes('word file') &&
    !lower.includes('draft');

  return !isPureQuestion;
}

/**
 * Identifies the exact document intent from natural language query or assistant message text.
 * Prioritizes Surname Change, DOB Correction, Address Change, Relation Update, One and the Same Person, and Name Change.
 */
export function getAffidavitDocType(text: string): SupportedDocumentType {
  if (!text) return 'name_change';
  const lower = text.toLowerCase();

  // 1. Surname / Last Name / Family Name Change
  if (
    lower.includes('surname') ||
    lower.includes('last name') ||
    lower.includes('lastname') ||
    lower.includes('family name') ||
    lower.includes('change surname') ||
    lower.includes('surname change') ||
    lower.includes('change my surname') ||
    lower.includes('update surname')
  ) {
    return 'surname_change';
  }

  // 2. Date of Birth / DoB queries
  if (
    lower.includes('date of birth') ||
    lower.includes('birth date') ||
    lower.includes('birth certificate') ||
    lower.includes('born on') ||
    lower.includes('correction of dob') ||
    lower.includes('dob correction') ||
    lower.includes('change dob') ||
    lower.includes('update dob') ||
    lower.includes('dob typo') ||
    lower.includes('rectification of dob') ||
    /\b(dob|d\.o\.b\.?)\b/i.test(text)
  ) {
    return 'dob_correction';
  }

  // 3. One and the same person
  if (
    lower.includes('one and the same') ||
    lower.includes('one and same') ||
    lower.includes('same person') ||
    lower.includes('alias') ||
    lower.includes('name variation') ||
    lower.includes('singular identity') ||
    lower.includes('two names refer to')
  ) {
    return 'one_and_same';
  }

  // 4. Relation / Parent / Spouse update
  if (
    lower.includes('relation update') ||
    lower.includes('father name') ||
    lower.includes("father's name") ||
    lower.includes('mother name') ||
    lower.includes("mother's name") ||
    lower.includes('spouse name') ||
    lower.includes("spouse's name") ||
    lower.includes('parent name') ||
    lower.includes("parent's name") ||
    lower.includes('husband name') ||
    lower.includes('wife name')
  ) {
    return 'relation_update';
  }

  // 5. Address change / Proof of residence
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
    lower.includes('relocation') ||
    lower.includes('shifted to a new') ||
    lower.includes('moving to a new') ||
    /\b(address|residence|relocation)\b/i.test(text)
  ) {
    return 'address_change';
  }

  // 6. Default: Name change / spelling correction
  return 'name_change';
}

/**
 * Checks whether an assistant message represents or contains a legal affidavit response
 * across supported legal scenarios.
 */
export function isAffidavitMessage(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();

  const mentionsAffidavit =
    lower.includes('affidavit') ||
    lower.includes('word document') ||
    lower.includes('.docx') ||
    lower.includes('notarized document');

  if (!mentionsAffidavit) return false;

  return (
    lower.includes('surname') ||
    lower.includes('last name') ||
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
 * Extracts structured affidavit fields from query or message text.
 * Dynamically resolves parameters for surname_change, name_change, address_change,
 * dob_correction, relation_update, and one_and_same.
 */
export function extractAffidavitDetails(
  text: string,
  defaultName?: string,
  queryContext?: string
): AffidavitPayload {
  const combinedText = queryContext ? `${queryContext}\n${text}` : text;
  const docType = getAffidavitDocType(combinedText);

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

  if (!combinedText) return result;

  // 1. Deponent Full Name Extraction
  const namePatterns = [
    /(?:my name is|i am|myself)\s*['"]?([A-Za-z\s\.]+?)['"]?(?:,\s*|\s+and|\s+i want|\s+need|\s+stating|\s+noticed|\.|$)/i,
    /I,\s*[*_]*([A-Za-z\s\.]+?)[*_]*,\s*(?:Son|Daughter|Spouse|S\/o|D\/o|W\/o)/i,
    /(?:recorded in|recorded as)\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*\s*(?:\.|\s|,|in)/i,
    /(?:Current Name|Old Name|Former Name|Deponent Name|Full Name)\s*:\s*[*_]*([A-Za-z\s\.]+?)[*_]*(?:\n|,|$)/i,
  ];

  for (const pat of namePatterns) {
    const match = combinedText.match(pat);
    if (match && match[1]) {
      const raw = match[1].trim();
      if (!raw.includes('[') && raw.length > 2 && !raw.toLowerCase().startsWith('changing') && !raw.toLowerCase().startsWith('officially')) {
        result.full_name = raw;
        break;
      }
    }
  }

  // 2. Father or Spouse Name
  const fatherMatch =
    combinedText.match(/(?:Son|Daughter|Spouse|S\/o|D\/o|W\/o)\s*(?:of)?\s*[*_]*([A-Za-z\s\.]+?)[*_]*,\s*aged/i) ||
    combinedText.match(/(?:Father's Name|Spouse Name|Father)\s*:\s*[*_]*([A-Za-z\s\.]+?)[*_]*(?:\n|,|$)/i);

  if (fatherMatch && fatherMatch[1]) {
    const raw = fatherMatch[1].trim();
    if (!raw.includes('[') && raw.length > 2) {
      result.father_or_spouse_name = raw;
    }
  }

  // 3. Age
  const ageMatch =
    combinedText.match(/aged\s*(?:about)?\s*[*_]*(\d+)[*_]*\s*years/i) ||
    combinedText.match(/(?:Age)\s*:\s*[*_]*(\d+)[*_]*/i);

  if (ageMatch && ageMatch[1]) {
    result.age = parseInt(ageMatch[1], 10);
  }

  // 4. City & State (e.g. "Ahmedabad", "Gujarat", "in Ahmedabad")
  const cityStateMatch =
    combinedText.match(/Verified at\s*[*_]*([A-Za-z\s]+?)[*_]*,\s*[*_]*([A-Za-z\s]+?)[*_]*\s*on/i) ||
    combinedText.match(/(?:City)\s*:\s*[*_]*([A-Za-z\s]+?)[*_]*(?:\n|,|$)/i) ||
    combinedText.match(/(?:in|at|city of)\s+([A-Za-z]+?)(?:,|\.|\s+state|\s+city|\s+please|\s+and|$)/i);

  if (cityStateMatch && cityStateMatch[1]) {
    const candidate = cityStateMatch[1].trim();
    const blacklist = ['my', 'official', 'our', 'a', 'an', 'this', 'word', 'government', 'educational'];
    if (!blacklist.includes(candidate.toLowerCase()) && candidate.length > 2) {
      result.city = candidate;
    }
    if (cityStateMatch[2]) {
      result.state = cityStateMatch[2].trim();
    }
  }

  // 5. Address
  const addrMatch =
    combinedText.match(/residing at\s*[*_]*([\s\S]+?)[*_]*,\s*do hereby/i) ||
    combinedText.match(/(?:Address|Residence)\s*:\s*[*_]*([^\n]+?)[*_]*(?:\n|$)/i);

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
  if (docType === 'surname_change') {
    // Check "change surname from X to Y" (e.g. "from John Mehta to John Joshi")
    const fromTo = combinedText.match(/(?:surname from|from)\s*['"“]?([A-Za-z\s]+?)['"”]?\s+to\s+['"“]?([A-Za-z\s]+?)['"”'’]?(?:,|\.|\s+in|\s+for|\s+and|\s+provide|\s+please|$)/i);
    if (fromTo && fromTo[1] && fromTo[2]) {
      result.old_value = fromTo[1].trim();
      result.new_value = fromTo[2].trim();
      if (!result.full_name) {
        result.full_name = result.old_value;
      }
    }

    // Check "change my surname to Verma" when name is "Rahul Sharma"
    if (!result.new_value) {
      const toSurMatch = combinedText.match(/(?:change(?:\s+my)?\s+surname\s+to|new\s+surname\s+is)\s*['"“]?([A-Za-z]+)['"”'’]?/i);
      if (toSurMatch && toSurMatch[1]) {
        const newSur = toSurMatch[1].trim();
        const fn = result.full_name || defaultName || '';
        if (fn && fn.includes(' ')) {
          const firstPart = fn.substring(0, fn.lastIndexOf(' '));
          result.new_value = `${firstPart} ${newSur}`;
          result.old_value = fn;
        } else {
          result.new_value = newSur;
          if (fn) result.old_value = fn;
        }
      }
    }

    if (!result.old_value && result.full_name) {
      result.old_value = result.full_name;
    }
    result.old_name = result.old_value;
    result.new_name = result.new_value;

  } else if (docType === 'dob_correction') {
    const dates = combinedText.match(/(\b\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}\b|\b\d{1,2}\s+[A-Za-z]+\s+\d{4}\b)/gi);
    if (dates && dates.length >= 2) {
      result.old_value = dates[0].trim();
      result.new_value = dates[1].trim();
    } else if (dates && dates.length === 1) {
      result.new_value = dates[0].trim();
      result.old_value = '[Incorrect Recorded DOB]';
    }

  } else if (docType === 'address_change') {
    const oldAddrMatch =
      combinedText.match(/(?:previously residing at|earlier address|previous address)\s*[:\s]*["“'*_]*([^\n"”]+?)["”'*_]*(?:\.|\n|,|where)/i) ||
      combinedText.match(/from\s*["“'*_]*([^\n"”]+?)["”'*_]*\s*to/i);

    if (oldAddrMatch && oldAddrMatch[1] && !oldAddrMatch[1].includes('[')) {
      result.old_value = oldAddrMatch[1].trim();
    }

    const newAddrMatch =
      combinedText.match(/(?:currently residing at|shifted to|new address|present address|moving to a new apartment in)\s*[:\s]*["“'*_]*([^\n"”]+?)["”'*_]*(?:\.|\n|,|where|do hereby|\s+please)/i) ||
      combinedText.match(/to\s*["“'*_]*([^\n"”]+?)["”'*_]*(?:\.|\n|,|$)/i);

    if (newAddrMatch && newAddrMatch[1] && !newAddrMatch[1].includes('[')) {
      result.new_value = newAddrMatch[1].trim();
      result.address = result.new_value;
    }

  } else if (docType === 'relation_update') {
    const relMatch =
      combinedText.match(/recorded as\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*,\s*whereas the true.*?name is\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*/i) ||
      combinedText.match(/from\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*\s*to\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*/i);

    if (relMatch && relMatch[1] && !relMatch[1].includes('[')) {
      result.old_value = relMatch[1].trim();
      if (relMatch[2] && !relMatch[2].includes('[')) {
        result.new_value = relMatch[2].trim();
      }
    }

  } else if (docType === 'one_and_same') {
    const sameMatch =
      combinedText.match(/(?:variations|specifically as)\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*\s*and\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*/i) ||
      combinedText.match(/names\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*\s*and\s*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*\s*refer/i);

    if (sameMatch && sameMatch[1] && !sameMatch[1].includes('[')) {
      result.old_value = sameMatch[1].trim();
      if (sameMatch[2] && !sameMatch[2].includes('[')) {
        result.new_value = sameMatch[2].trim();
      }
    }

  } else {
    // name_change / spelling correction
    const spellingMatch = combinedText.match(/(?:spelling from|name from|from)\s*['"“]?([A-Za-z\s\.]+?)['"”]?\s+to\s+['"“]?([A-Za-z\s\.]+?)['"”'’]?(?:,|\.|\s+in|\s+for|\s+and|\s+please|$)/i);
    if (spellingMatch && spellingMatch[1] && spellingMatch[2]) {
      result.old_value = spellingMatch[1].trim();
      result.new_value = spellingMatch[2].trim();
      result.old_name = result.old_value;
      result.new_name = result.new_value;
    } else {
      const newNameMatch =
        combinedText.match(/(?:New Name|solely as|addressed as)\s*[:\s]*["“'*_]*([A-Za-z\s\.]+?)["”'*_]*(?:\.|\s|,|\n|$)/i) ||
        combinedText.match(/affidavit for\s*[*_]*([A-Za-z\s\.]+?)[*_]*\s*(?:has been|is)/i);

      if (newNameMatch && newNameMatch[1] && !newNameMatch[1].includes('[')) {
        result.new_name = newNameMatch[1].trim();
        result.new_value = newNameMatch[1].trim();
      }
      result.old_value = result.full_name;
      result.old_name = result.full_name;
    }
  }

  // Fallbacks using defaultName
  if (!result.full_name && defaultName) {
    result.full_name = defaultName;
  }
  if (!result.full_name) {
    result.full_name = result.old_value || 'Deponent Full Name';
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
    surname_change: 'Surname_Change',
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
