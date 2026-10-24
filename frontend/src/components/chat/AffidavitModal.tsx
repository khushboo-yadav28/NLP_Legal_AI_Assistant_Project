// src/components/chat/AffidavitModal.tsx
import { useState, useEffect } from 'react';
import {
  X,
  FileDown,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Home,
  Calendar,
  Users,
} from 'lucide-react';
import {
  generateAndDownloadAffidavit,
  type AffidavitPayload,
  type SupportedDocumentType,
} from '../../services/documentService';

interface AffidavitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (filename: string, payload: AffidavitPayload) => void;
  initialData?: AffidavitPayload | null;
}

export default function AffidavitModal({ isOpen, onClose, onSuccess, initialData }: AffidavitModalProps) {
  const [docType, setDocType] = useState<SupportedDocumentType>('name_change');
  const [formData, setFormData] = useState<AffidavitPayload>({
    document_type: 'name_change',
    full_name: '',
    old_value: '',
    new_value: '',
    new_name: '',
    father_or_spouse_name: '',
    age: '',
    address: '',
    city: '',
    state: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successFilename, setSuccessFilename] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessFilename(null);

      const incomingType = initialData?.document_type as SupportedDocumentType;
      const validTypes: SupportedDocumentType[] = [
        'surname_change',
        'name_change',
        'address_change',
        'dob_correction',
        'relation_update',
        'one_and_same',
      ];
      const targetType: SupportedDocumentType = validTypes.includes(incomingType)
        ? incomingType
        : 'name_change';

      setDocType(targetType);

      const initial: AffidavitPayload = {
        document_type: targetType,
        full_name: initialData?.full_name || '',
        old_value: initialData?.old_value || initialData?.old_name || '',
        new_value: initialData?.new_value || initialData?.new_name || '',
        new_name: initialData?.new_name || initialData?.new_value || '',
        father_or_spouse_name: initialData?.father_or_spouse_name || '',
        age: initialData?.age ? String(initialData.age) : '',
        address: initialData?.address || '',
        city: initialData?.city || '',
        state: initialData?.state || '',
      };

      if (!initial.full_name) {
        try {
          const storedUser = localStorage.getItem('legal_ai_user');
          if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user?.full_name) {
              initial.full_name = user.full_name;
              if ((targetType === 'name_change' || targetType === 'surname_change') && !initial.old_value) {
                initial.old_value = user.full_name;
              }
            }
          }
        } catch {
          // Ignore parse errors
        }
      }

      setFormData(initial);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleTypeSwitch = (type: SupportedDocumentType) => {
    setDocType(type);
    setFormData(prev => ({
      ...prev,
      document_type: type,
      old_value: '',
      new_value: '',
      new_name: (type === 'name_change' || type === 'surname_change') ? prev.new_name : '',
    }));
    if (error) setError(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessFilename(null);

    if (!formData.full_name?.trim()) {
      setError('Please provide the deponent full name.');
      return;
    }

    if (docType === 'surname_change') {
      const newSurnameVal = (formData.new_value || formData.new_name || '').trim();
      if (!newSurnameVal) {
        setError('Please provide the new full name with adopted surname (e.g. John Joshi).');
        return;
      }
    } else if (docType === 'name_change') {
      const newName = (formData.new_value || formData.new_name || '').trim();
      if (!newName) {
        setError('Please provide the new / corrected full name.');
        return;
      }
    } else if (docType === 'address_change') {
      if (!formData.new_value?.trim()) {
        setError('Please provide the new residential address.');
        return;
      }
    } else if (docType === 'dob_correction') {
      if (!formData.new_value?.trim()) {
        setError('Please provide the actual correct DOB.');
        return;
      }
    } else if (docType === 'relation_update') {
      if (!formData.old_value?.trim() || !formData.new_value?.trim()) {
        setError('Please provide both the incorrect recorded relation name and the correct name.');
        return;
      }
    } else if (docType === 'one_and_same') {
      if (!formData.old_value?.trim() || !formData.new_value?.trim()) {
        setError('Please provide both name variations representing the same individual.');
        return;
      }
    }

    let parsedAge: number | string = formData.age ? String(formData.age).trim() : '';
    if (parsedAge) {
      const ageNum = parseInt(String(parsedAge), 10);
      if (!isNaN(ageNum) && ageNum > 0 && ageNum <= 130) {
        parsedAge = ageNum;
      }
    }

    const payloadToSend: AffidavitPayload = {
      ...formData,
      document_type: docType,
      age: parsedAge,
      old_value:
        docType === 'surname_change' || docType === 'name_change'
          ? (formData.old_value || formData.full_name)
          : formData.old_value,
      new_value:
        docType === 'surname_change' || docType === 'name_change'
          ? (formData.new_value || formData.new_name)
          : formData.new_value,
      new_name:
        docType === 'surname_change' || docType === 'name_change'
          ? (formData.new_value || formData.new_name)
          : formData.new_name,
    };

    try {
      setIsLoading(true);
      const result = await generateAndDownloadAffidavit(payloadToSend);

      setSuccessFilename(result.filename);
      if (onSuccess) {
        onSuccess(result.filename, payloadToSend);
      }

      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error('Affidavit Generation Error:', err);
      setError(err?.message || 'Failed to generate affidavit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getFormatGuaranteeText = () => {
    switch (docType) {
      case 'surname_change':
        return 'Surname Change / Family Name Affidavit (.docx) formatted strictly for official surname relinquishment & adoption before Notary Public & Gazette.';
      case 'dob_correction':
        return 'Date of Birth Correction Affidavit (.docx) formatted for School Boards, Birth Registrar, PAN & Passport Authorities.';
      case 'relation_update':
        return 'Parent / Spouse Name Correction Affidavit (.docx) formatted for official government databases and ID records.';
      case 'one_and_same':
        return 'One and the Same Person Affidavit (.docx) legally verifying identical individual identity across discrepant educational certificates & government IDs.';
      case 'address_change':
        return 'Address Change / Residence Proof Affidavit (.docx) formatted for submission to Passport Office, Banks & Aadhaar.';
      case 'name_change':
      default:
        return 'Name Change / Spelling Correction Affidavit (.docx) formatted for Gazette notification & Non-Judicial Stamp Paper notarization.';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-message">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="affidavit-modal-title"
      >
        <div className="bg-brand-blue text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-gold/20 text-brand-gold rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 id="affidavit-modal-title" className="text-xl font-serif font-bold text-white">
                Generate Legal Affidavit (.docx)
              </h2>
              <p className="text-xs text-gray-300">
                Standardized Word document ready for stamp paper execution & notarization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-50 border-b border-gray-200 px-6 py-2.5 flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
          <button
            type="button"
            onClick={() => handleTypeSwitch('surname_change')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer ${
              docType === 'surname_change'
                ? 'bg-brand-blue text-brand-gold shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Surname Change</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeSwitch('name_change')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer ${
              docType === 'name_change'
                ? 'bg-brand-blue text-brand-gold shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Name Change</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeSwitch('address_change')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer ${
              docType === 'address_change'
                ? 'bg-brand-blue text-brand-gold shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Address Change</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeSwitch('dob_correction')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer ${
              docType === 'dob_correction'
                ? 'bg-brand-blue text-brand-gold shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Date of Birth (DOB)</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeSwitch('relation_update')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer ${
              docType === 'relation_update'
                ? 'bg-brand-blue text-brand-gold shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Parent/Spouse</span>
          </button>

          <button
            type="button"
            onClick={() => handleTypeSwitch('one_and_same')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0 cursor-pointer ${
              docType === 'one_and_same'
                ? 'bg-brand-blue text-brand-gold shadow-xs'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>One & Same Person</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successFilename && (
            <div className="p-3.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-green-600" />
              <span>
                <strong>Document generated!</strong> Your download for <em>{successFilename}</em> has started.
              </span>
            </div>
          )}

          {docType === 'surname_change' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Full Name with Former Surname <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name || ''}
                  onChange={handleChange}
                  placeholder="e.g., John Mehta"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
                />
                <span className="text-[11px] text-gray-400">Current full name recorded in official records</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  New Full Name with Adopted Surname <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="new_value"
                  value={formData.new_value || formData.new_name || ''}
                  onChange={handleChange}
                  placeholder="e.g., John Joshi"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
                />
                <span className="text-[11px] text-gray-400">Full legal name with the newly assumed surname</span>
              </div>
            </div>
          )}

          {docType === 'name_change' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Current / Old Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name || ''}
                  onChange={handleChange}
                  placeholder="e.g., Rajesh Kumar Sharma"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
                />
                <span className="text-[11px] text-gray-400">Name recorded in existing documents</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  New / Corrected Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="new_value"
                  value={formData.new_value || formData.new_name || ''}
                  onChange={handleChange}
                  placeholder="e.g., Rajesh Sharma"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
                />
                <span className="text-[11px] text-gray-400">New name to be officially adopted</span>
              </div>
            </div>
          )}

          {docType === 'address_change' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Deponent Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name || ''}
                  onChange={handleChange}
                  placeholder="e.g., Sanjay Gupta"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Previous Address (Old Residence)
                  </label>
                  <textarea
                    name="old_value"
                    rows={2}
                    value={formData.old_value || ''}
                    onChange={handleChange}
                    placeholder="e.g., Flat 12, Sunrise Apts, Bandra West"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition resize-none"
                  />
                  <span className="text-[11px] text-gray-400">Address recorded earlier</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    New Residential Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="new_value"
                    rows={2}
                    value={formData.new_value || ''}
                    onChange={handleChange}
                    placeholder="e.g., House 402, Green Avenue, Whitefield"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition resize-none"
                  />
                  <span className="text-[11px] text-gray-400">Current residence where you shifted</span>
                </div>
              </div>
            </div>
          )}

          {docType === 'dob_correction' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Deponent Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name || ''}
                  onChange={handleChange}
                  placeholder="e.g., Ananya Deshmukh"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Incorrect Recorded DOB
                  </label>
                  <input
                    type="text"
                    name="old_value"
                    value={formData.old_value || ''}
                    onChange={handleChange}
                    placeholder="e.g., 14/08/1992 (DD/MM/YYYY)"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
                  />
                  <span className="text-[11px] text-gray-400">Erroneous date of birth in records</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Actual / Correct DOB <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="new_value"
                    value={formData.new_value || ''}
                    onChange={handleChange}
                    placeholder="e.g., 15-08-1998 (DD-MM-YYYY)"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
                  />
                  <span className="text-[11px] text-gray-400">Genuine date of birth per certificates</span>
                </div>
              </div>
            </div>
          )}

          {docType === 'relation_update' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Deponent Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name || ''}
                  onChange={handleChange}
                  placeholder="e.g., Karan Verma"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Incorrect Recorded Relative Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="old_value"
                    value={formData.old_value || ''}
                    onChange={handleChange}
                    placeholder="e.g., R. K. Verma"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Correct Actual Relative Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="new_value"
                    value={formData.new_value || ''}
                    onChange={handleChange}
                    placeholder="e.g., Ramesh Kumar Verma"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
                  />
                </div>
              </div>
            </div>
          )}

          {docType === 'one_and_same' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Deponent Full Legal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name || ''}
                  onChange={handleChange}
                  placeholder="e.g., Vikramaditya Sharma"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Name Variation 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="old_value"
                    value={formData.old_value || ''}
                    onChange={handleChange}
                    placeholder="e.g., Vikram Sharma"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Name Variation 2 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="new_value"
                    value={formData.new_value || ''}
                    onChange={handleChange}
                    placeholder="e.g., Vikramaditya Sharma"
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Father's / Spouse's Name
              </label>
              <input
                type="text"
                name="father_or_spouse_name"
                value={formData.father_or_spouse_name || ''}
                onChange={handleChange}
                placeholder="e.g., Suresh Sharma"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Age (in Years)
              </label>
              <input
                type="number"
                name="age"
                min="1"
                max="125"
                value={formData.age || ''}
                onChange={handleChange}
                placeholder="e.g., 32"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
              />
            </div>
          </div>

          {docType !== 'address_change' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Residential Address
              </label>
              <textarea
                name="address"
                rows={2}
                value={formData.address || ''}
                onChange={handleChange}
                placeholder="e.g., Flat 402, Lotus Apartments, Sector 15"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition resize-none"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city || ''}
                onChange={handleChange}
                placeholder="e.g., Ahmedabad"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state || ''}
                onChange={handleChange}
                placeholder="e.g., Gujarat"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 outline-none text-sm transition"
              />
            </div>
          </div>

          <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 text-xs text-amber-800">
            <strong>Format Guarantee:</strong> Generates a complete, legally formatted{' '}
            {getFormatGuaranteeText()}{' '}
            Includes deponent declaration, verification clauses, and notary attestation spaces ready for non-judicial stamp paper.
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition text-sm font-medium disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-lg bg-brand-blue text-brand-gold hover:bg-[#152a5c] transition text-sm font-semibold flex items-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating .docx...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Generate & Download Affidavit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}