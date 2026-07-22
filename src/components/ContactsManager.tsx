import React, { useState, useMemo } from 'react';
import { Contact, ContactList, Tenant } from '../types';
import { normalizePhoneNumber } from '../lib/smsService';
import * as XLSX from 'xlsx';
import { 
  Users, 
  UserPlus, 
  Upload, 
  Trash2, 
  Filter, 
  Search, 
  Check, 
  AlertCircle, 
  X,
  Plus,
  HelpCircle,
  FileSpreadsheet,
  Layers,
  FolderPlus,
  Download,
  CheckSquare,
  Square,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Building2,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Tag,
  ShieldCheck,
  UserCheck,
  Settings2,
  Database,
  Calendar,
  Shuffle,
  FileCode,
  Link2,
  CheckCircle2,
  Info,
  GitMerge,
  ArrowLeftRight,
  Sliders,
  CheckCheck,
  AlertTriangle,
  Ban,
  Eye,
  EyeOff
} from 'lucide-react';

interface ContactsManagerProps {
  contacts: Contact[];
  contactLists?: ContactList[];
  activeTenant?: Tenant;
  onAddContact: (contact: Contact) => void;
  onAddBulkContacts: (contactsList: Contact[], strategy?: 'MERGE' | 'SKIP' | 'OVERWRITE', targetGroupIds?: string[]) => void;
  onDeleteContact: (id: string) => void;
  onAddContactList?: (list: ContactList) => void;
  onDeleteContactList?: (id: string) => void;
}

export interface SmartConflictField {
  key: string;
  label: string;
  existingVal: string;
  importedVal: string;
  isDifferent: boolean;
}

export interface SmartConflictItem {
  id: string;
  existingContact: Contact;
  importedContact: Contact;
  resolution: 'MERGE' | 'SKIP' | 'OVERWRITE';
  diffFields: SmartConflictField[];
}

// Available Standard Mappings
const MAPPING_FIELDS = [
  { key: 'ignore', label: '-- Ignore Field --' },
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'phoneNumber', label: 'Phone Number (E.164)' },
  { key: 'email', label: 'Email Address' },
  { key: 'company', label: 'Company' },
  { key: 'department', label: 'Department' },
  { key: 'position', label: 'Position / Role' },
  { key: 'location', label: 'Location / City' },
  { key: 'gender', label: 'Gender' },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'customMemberId', label: 'Custom: Member ID' },
  { key: 'customBalance', label: 'Custom: Savings Balance' },
  { key: 'notes', label: 'Notes' }
];

const PREDEFINED_GROUP_TYPES: { category: ContactList['category']; name: string; desc: string; icon: string }[] = [
  { category: 'Customers', name: 'Key Customers & Clients', desc: 'Active purchasing customers and account holders.', icon: '👥' },
  { category: 'Staff', name: 'Internal Staff & Employees', desc: 'Internal company team members and operational staff.', icon: '💼' },
  { category: 'VIP Clients', name: 'VIP High-Value Members', desc: 'Priority accounts with high transaction volume.', icon: '🌟' },
  { category: 'Suppliers', name: 'Suppliers & Vendors', desc: 'Contractors, partners, and logistics suppliers.', icon: '🚚' },
  { category: 'Students', name: 'Students & Enrollees', desc: 'Registered students, trainees, or course enrollees.', icon: '🎓' },
  { category: 'Parents', name: 'Parents & Guardians', desc: 'Primary contacts for school and youth programs.', icon: '👨‍👩‍👧' },
  { category: 'Marketing Subscribers', name: 'Newsletter Subscribers', desc: 'Opted-in leads and promotional campaign subscribers.', icon: '📧' }
];

export default function ContactsManager({
  contacts,
  contactLists = [],
  activeTenant,
  onAddContact,
  onAddBulkContacts,
  onDeleteContact,
  onAddContactList,
  onDeleteContactList
}: ContactsManagerProps) {
  const [viewMode, setViewMode] = useState<'CONTACTS' | 'LISTS' | 'INTEGRATIONS'>('CONTACTS');
  const [search, setSearch] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('ALL');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('ALL');
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>('ALL');

  // Selected Checkboxes for Bulk Operations
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkActionModal, setShowBulkActionModal] = useState<'ASSIGN' | 'REMOVE' | 'MOVE' | 'DELETE' | null>(null);

  // Single Add Form
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formPhoneNumber, setFormPhoneNumber] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formGender, setFormGender] = useState('Male');
  const [formDOB, setFormDOB] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formTags, setFormTags] = useState('Member');
  const [formSelectedGroupIds, setFormSelectedGroupIds] = useState<string[]>([]);
  const [formDuplicateWarning, setFormDuplicateWarning] = useState('');

  // Group Create Form
  const [listName, setListName] = useState('');
  const [listDescription, setListDescription] = useState('');
  const [listCategory, setListCategory] = useState<ContactList['category']>('Customers');
  const [listType, setListType] = useState<'LIST' | 'GROUP' | 'SEGMENT'>('GROUP');

  // Import State Wizard
  const [importStep, setImportStep] = useState<1 | 2 | 3 | 4>(1);
  const [importMethod, setImportMethod] = useState<'FILE' | 'PASTE'>('FILE');
  const [rawPasteText, setRawPasteText] = useState(`First Name,Last Name,Phone Number,Email,Company,Department,Position,Location
Kamau,Wanjiku,+254712345600,wanjiku@kamau.co.ke,Safaricom Sacco,Finance,Senior Analyst,Nairobi
Amina,Yusuf,+254722334411,amina@yusuf.or.ke,Kilimo Cooperative,Agriculture,Agronomist,Nakuru
David,Omondi,+254788990011,david.omondi@agritrust.or.ke,AgriTrust,Logistics,Field Officer,Eldoret`);
  
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  
  // Destination groups during import
  const [importSelectedGroupIds, setImportSelectedGroupIds] = useState<string[]>([]);
  const [importNewGroupName, setImportNewGroupName] = useState('');
  const [importNewGroupCategory, setImportNewGroupCategory] = useState<ContactList['category']>('Customers');
  
  // Duplicate Resolution strategy
  const [dedupStrategy, setDedupStrategy] = useState<'MERGE' | 'SKIP' | 'OVERWRITE'>('MERGE');

  // Smart Resolution Dialog States
  const [smartConflicts, setSmartConflicts] = useState<SmartConflictItem[]>([]);
  const [showSmartResolutionModal, setShowSmartResolutionModal] = useState<boolean>(false);
  const [conflictSearchQuery, setConflictSearchQuery] = useState<string>('');
  const [showOnlyDiffFields, setShowOnlyDiffFields] = useState<boolean>(true);

  // CRM Sync Simulator State
  const [syncingCrm, setSyncingCrm] = useState<string | null>(null);

  // Filter Tenant Specific Contacts
  const tenantContacts = useMemo(() => {
    if (!activeTenant) return contacts;
    return contacts.filter(c => !c.tenantId || c.tenantId === activeTenant.id);
  }, [contacts, activeTenant]);

  // Filter Tenant Specific Groups
  const tenantGroups = useMemo(() => {
    if (!activeTenant) return contactLists;
    return contactLists.filter(l => !l.tenantId || l.tenantId === activeTenant.id);
  }, [contactLists, activeTenant]);

  // Derived Tags and Locations
  const allTags = useMemo(() => Array.from(new Set(tenantContacts.flatMap(c => c.tags || []))), [tenantContacts]);
  const allLocations = useMemo(() => Array.from(new Set(tenantContacts.map(c => c.location).filter(Boolean) as string[])), [tenantContacts]);

  // Filtered Contacts List
  const filteredContacts = useMemo(() => {
    return tenantContacts.filter(c => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || (
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
        c.phoneNumber.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.department && c.department.toLowerCase().includes(q)) ||
        (c.position && c.position.toLowerCase().includes(q)) ||
        (c.location && c.location.toLowerCase().includes(q))
      );

      const assignedGroups = c.groupIds || c.listIds || [];
      const matchesGroup = selectedGroupFilter === 'ALL' || assignedGroups.includes(selectedGroupFilter);
      const matchesTag = selectedTagFilter === 'ALL' || (c.tags || []).includes(selectedTagFilter);
      const matchesLocation = selectedLocationFilter === 'ALL' || c.location === selectedLocationFilter;

      return matchesSearch && matchesGroup && matchesTag && matchesLocation;
    });
  }, [tenantContacts, search, selectedGroupFilter, selectedTagFilter, selectedLocationFilter]);

  // Handle Phone input & Check Duplicates in Single Add
  const handlePhoneChange = (val: string) => {
    setFormPhoneNumber(val);
    if (!val.trim()) {
      setFormDuplicateWarning('');
      return;
    }
    const norm = normalizePhoneNumber(val);
    const dup = tenantContacts.find(c => normalizePhoneNumber(c.phoneNumber) === norm);
    if (dup) {
      setFormDuplicateWarning(`⚠️ Contact with phone ${val} (${norm}) already exists (${dup.firstName} ${dup.lastName}). Saving will update existing record.`);
    } else {
      setFormDuplicateWarning('');
    }
  };

  // Single Add Submit
  const handleSingleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPhoneNumber.trim()) return;

    const parsedTags = formTags.split(',').map(t => t.trim()).filter(Boolean);
    const newContact: Contact = {
      id: `c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId: activeTenant?.id || 't-safaricom-sacco',
      firstName: formFirstName.trim() || 'Contact',
      lastName: formLastName.trim(),
      phoneNumber: normalizePhoneNumber(formPhoneNumber.trim()),
      email: formEmail.trim(),
      company: formCompany.trim(),
      department: formDepartment.trim(),
      position: formPosition.trim(),
      location: formLocation.trim(),
      gender: formGender,
      dateOfBirth: formDOB,
      notes: formNotes.trim(),
      tags: parsedTags.length > 0 ? parsedTags : ['Member'],
      listIds: formSelectedGroupIds,
      groupIds: formSelectedGroupIds,
      createdAt: new Date().toISOString()
    };

    onAddContact(newContact);
    resetSingleForm();
    setShowAddModal(false);
  };

  const resetSingleForm = () => {
    setFormFirstName('');
    setFormLastName('');
    setFormPhoneNumber('');
    setFormEmail('');
    setFormCompany('');
    setFormDepartment('');
    setFormPosition('');
    setFormLocation('');
    setFormGender('Male');
    setFormDOB('');
    setFormNotes('');
    setFormTags('Member');
    setFormSelectedGroupIds([]);
    setFormDuplicateWarning('');
  };

  // Group Create
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listName.trim()) return;

    const newList: ContactList = {
      id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId: activeTenant?.id || 't-safaricom-sacco',
      name: listName.trim(),
      description: listDescription.trim(),
      type: listType,
      category: listCategory,
      contactCount: 0,
      createdAt: new Date().toISOString()
    };

    if (onAddContactList) onAddContactList(newList);

    setListName('');
    setListDescription('');
    setShowListModal(false);
  };

  // Quick 1-Click Predefined Group Create
  const handleQuickGroupCreate = (preset: typeof PREDEFINED_GROUP_TYPES[0]) => {
    const newList: ContactList = {
      id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      tenantId: activeTenant?.id || 't-safaricom-sacco',
      name: preset.name,
      description: preset.desc,
      type: 'GROUP',
      category: preset.category,
      contactCount: 0,
      createdAt: new Date().toISOString()
    };
    if (onAddContactList) onAddContactList(newList);
  };

  // Checkbox Select Logic
  const handleSelectAll = () => {
    if (selectedContactIds.length === filteredContacts.length) {
      setSelectedContactIds([]);
    } else {
      setSelectedContactIds(filteredContacts.map(c => c.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedContactIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Bulk Actions
  const handleConfirmBatchAction = (targetGroupIds: string[]) => {
    if (!showBulkActionModal) return;

    if (showBulkActionModal === 'DELETE') {
      fetch('/api/contacts/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: selectedContactIds })
      })
      .then(() => {
        selectedContactIds.forEach(id => onDeleteContact(id));
        setSelectedContactIds([]);
        setShowBulkActionModal(null);
      })
      .catch(err => console.error('Error batch deleting:', err));
    } else if (showBulkActionModal === 'ASSIGN') {
      fetch('/api/contacts/batch-assign-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: selectedContactIds, groupIds: targetGroupIds })
      })
      .then(() => {
        // Local state refresh via server WebSocket
        setSelectedContactIds([]);
        setShowBulkActionModal(null);
      });
    } else if (showBulkActionModal === 'REMOVE') {
      fetch('/api/contacts/batch-remove-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: selectedContactIds, groupIds: targetGroupIds })
      })
      .then(() => {
        setSelectedContactIds([]);
        setShowBulkActionModal(null);
      });
    }
  };

  // Export Selected / Filtered Contacts to CSV
  const handleExportCSV = (contactListToExport: Contact[] = filteredContacts) => {
    const headers = ['First Name', 'Last Name', 'Phone Number', 'Email', 'Company', 'Department', 'Position', 'Location', 'Gender', 'Groups', 'Tags'];
    const rows = contactListToExport.map(c => {
      const groupNames = (c.groupIds || c.listIds || [])
        .map(gid => tenantGroups.find(g => g.id === gid)?.name)
        .filter(Boolean)
        .join('; ');

      return [
        `"${c.firstName || ''}"`,
        `"${c.lastName || ''}"`,
        `"${c.phoneNumber || ''}"`,
        `"${c.email || ''}"`,
        `"${c.company || ''}"`,
        `"${c.department || ''}"`,
        `"${c.position || ''}"`,
        `"${c.location || ''}"`,
        `"${c.gender || ''}"`,
        `"${groupNames}"`,
        `"${(c.tags || []).join('; ')}"`
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTenant?.subdomain || 'audience'}-contacts-export-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle File Upload Parsing (CSV / Excel)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonRows.length === 0) return;

        const headers = jsonRows[0].map((h: any) => String(h || '').trim());
        const dataRows = jsonRows.slice(1).map(row => {
          const obj: Record<string, string> = {};
          headers.forEach((h: string, idx: number) => {
            obj[h] = row[idx] !== undefined ? String(row[idx]).trim() : '';
          });
          return obj;
        }).filter(r => Object.values(r).some(v => v));

        setParsedHeaders(headers);
        setParsedRows(dataRows);
        
        // Auto-guess column mappings
        const initialMap: Record<string, string> = {};
        headers.forEach((h: string) => {
          const lower = h.toLowerCase();
          if (lower.includes('first') || lower === 'fname') initialMap[h] = 'firstName';
          else if (lower.includes('last') || lower === 'lname') initialMap[h] = 'lastName';
          else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel')) initialMap[h] = 'phoneNumber';
          else if (lower.includes('email') || lower.includes('mail')) initialMap[h] = 'email';
          else if (lower.includes('company') || lower.includes('org')) initialMap[h] = 'company';
          else if (lower.includes('dept') || lower.includes('department')) initialMap[h] = 'department';
          else if (lower.includes('pos') || lower.includes('role') || lower.includes('title')) initialMap[h] = 'position';
          else if (lower.includes('loc') || lower.includes('city') || lower.includes('county')) initialMap[h] = 'location';
          else if (lower.includes('gender') || lower.includes('sex')) initialMap[h] = 'gender';
          else if (lower.includes('dob') || lower.includes('birth')) initialMap[h] = 'dateOfBirth';
          else initialMap[h] = 'ignore';
        });

        setColumnMappings(initialMap);
        setImportStep(2);
      } catch (err) {
        console.error('Error reading Excel/CSV file:', err);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Parse Raw Text Area Paste
  const handleParseTextPaste = () => {
    if (!rawPasteText.trim()) return;
    const lines = rawPasteText.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    // Detect delimiter (tab, comma, semicolon, pipe)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes('\t')) delimiter = '\t';
    else if (firstLine.includes(';')) delimiter = ';';
    else if (firstLine.includes('|')) delimiter = '|';

    const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1).map(line => {
      const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        obj[h] = cols[idx] || '';
      });
      return obj;
    });

    setParsedHeaders(headers);
    setParsedRows(rows);

    const initialMap: Record<string, string> = {};
    headers.forEach(h => {
      const lower = h.toLowerCase();
      if (lower.includes('first') || lower === 'fname') initialMap[h] = 'firstName';
      else if (lower.includes('last') || lower === 'lname') initialMap[h] = 'lastName';
      else if (lower.includes('phone') || lower.includes('mobile')) initialMap[h] = 'phoneNumber';
      else if (lower.includes('email')) initialMap[h] = 'email';
      else if (lower.includes('company')) initialMap[h] = 'company';
      else if (lower.includes('dept')) initialMap[h] = 'department';
      else if (lower.includes('pos') || lower.includes('role')) initialMap[h] = 'position';
      else if (lower.includes('loc') || lower.includes('city')) initialMap[h] = 'location';
      else initialMap[h] = 'ignore';
    });

    setColumnMappings(initialMap);
    setImportStep(2);
  };

  // Build prepared contact array from mapped rows
  const buildPreparedContactsToImport = (): Contact[] => {
    return parsedRows.map((row, idx) => {
      const contactObj: Partial<Contact> = {
        id: `c-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
        tenantId: activeTenant?.id || 't-safaricom-sacco',
        tags: ['Imported'],
        createdAt: new Date().toISOString()
      };

      Object.entries(columnMappings).forEach(([colHeader, mappedField]) => {
        if (mappedField === 'ignore') return;
        const val = row[colHeader] || '';
        if (mappedField === 'firstName') contactObj.firstName = val;
        else if (mappedField === 'lastName') contactObj.lastName = val;
        else if (mappedField === 'phoneNumber') contactObj.phoneNumber = val;
        else if (mappedField === 'email') contactObj.email = val;
        else if (mappedField === 'company') contactObj.company = val;
        else if (mappedField === 'department') contactObj.department = val;
        else if (mappedField === 'position') contactObj.position = val;
        else if (mappedField === 'location') contactObj.location = val;
        else if (mappedField === 'gender') contactObj.gender = val;
        else if (mappedField === 'dateOfBirth') contactObj.dateOfBirth = val;
        else if (mappedField === 'notes') contactObj.notes = val;
        else if (mappedField === 'customMemberId') {
          contactObj.customFields = { ...contactObj.customFields, memberId: val };
        } else if (mappedField === 'customBalance') {
          contactObj.customFields = { ...contactObj.customFields, savingsBalance: val };
        }
      });

      if (!contactObj.phoneNumber) {
        contactObj.phoneNumber = `+254799000${Math.floor(100 + Math.random() * 900)}`;
      }

      return contactObj as Contact;
    });
  };

  // Build list of duplicate conflicts with side-by-side field differences
  const buildSmartConflictsList = (incomingList: Contact[]): SmartConflictItem[] => {
    const conflicts: SmartConflictItem[] = [];

    incomingList.forEach((imp) => {
      const phoneNorm = (imp.phoneNumber || '').replace(/\s+/g, '');
      const emailNorm = (imp.email || '').trim().toLowerCase();

      const existing = tenantContacts.find(c => {
        const cPhone = (c.phoneNumber || '').replace(/\s+/g, '');
        const cEmail = (c.email || '').trim().toLowerCase();
        return (phoneNorm && cPhone === phoneNorm) || (emailNorm && cEmail && cEmail === emailNorm);
      });

      if (existing) {
        const fieldSpecs = [
          { key: 'firstName', label: 'First Name' },
          { key: 'lastName', label: 'Last Name' },
          { key: 'phoneNumber', label: 'Phone Number' },
          { key: 'email', label: 'Email Address' },
          { key: 'company', label: 'Company' },
          { key: 'department', label: 'Department' },
          { key: 'position', label: 'Position / Role' },
          { key: 'location', label: 'Location / City' },
          { key: 'gender', label: 'Gender' },
          { key: 'dateOfBirth', label: 'Date of Birth' },
          { key: 'notes', label: 'Notes' },
          { key: 'memberId', label: 'Member ID (Custom)' },
          { key: 'savingsBalance', label: 'Savings Balance (Custom)' }
        ];

        const diffFields: SmartConflictField[] = fieldSpecs.map(spec => {
          let existingVal = '';
          let importedVal = '';

          if (spec.key === 'memberId') {
            existingVal = existing.customFields?.memberId || '';
            importedVal = imp.customFields?.memberId || '';
          } else if (spec.key === 'savingsBalance') {
            existingVal = existing.customFields?.savingsBalance || '';
            importedVal = imp.customFields?.savingsBalance || '';
          } else {
            existingVal = String((existing as any)[spec.key] || '');
            importedVal = String((imp as any)[spec.key] || '');
          }

          const isDifferent = existingVal.trim() !== importedVal.trim() && (importedVal.trim() !== '' || existingVal.trim() !== '');

          return {
            key: spec.key,
            label: spec.label,
            existingVal,
            importedVal,
            isDifferent
          };
        });

        conflicts.push({
          id: `conflict-${existing.id}-${imp.id}`,
          existingContact: existing,
          importedContact: imp,
          resolution: dedupStrategy,
          diffFields
        });
      }
    });

    return conflicts;
  };

  // Open Smart Resolution Dialog
  const handleOpenSmartResolution = () => {
    const contactsToImport = buildPreparedContactsToImport();
    const conflicts = buildSmartConflictsList(contactsToImport);
    setSmartConflicts(conflicts);
    setShowSmartResolutionModal(true);
  };

  // Apply resolution strategy to all conflicts
  const handleSetAllConflictResolutions = (strat: 'MERGE' | 'SKIP' | 'OVERWRITE') => {
    setSmartConflicts(prev => prev.map(item => ({ ...item, resolution: strat })));
    setDedupStrategy(strat);
  };

  // Apply resolution strategy to a single conflict item
  const handleSetSingleConflictResolution = (conflictId: string, strat: 'MERGE' | 'SKIP' | 'OVERWRITE') => {
    setSmartConflicts(prev => prev.map(item => item.id === conflictId ? { ...item, resolution: strat } : item));
  };

  // Complete final import with resolved duplicate items
  const handleExecuteSmartImport = () => {
    let targetGroupIds = [...importSelectedGroupIds];

    if (importNewGroupName.trim()) {
      const newGrpId = `list-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newGrp: ContactList = {
        id: newGrpId,
        tenantId: activeTenant?.id || 't-safaricom-sacco',
        name: importNewGroupName.trim(),
        description: `Imported group generated on ${new Date().toLocaleDateString()}`,
        type: 'GROUP',
        category: importNewGroupCategory,
        contactCount: parsedRows.length,
        createdAt: new Date().toISOString()
      };
      if (onAddContactList) onAddContactList(newGrp);
      targetGroupIds.push(newGrpId);
    }

    const contactsToImport = buildPreparedContactsToImport();

    const finalContacts = contactsToImport.map(imp => {
      const matchedConflict = smartConflicts.find(c =>
        c.importedContact.id === imp.id ||
        (c.importedContact.phoneNumber && c.importedContact.phoneNumber.replace(/\s+/g, '') === imp.phoneNumber.replace(/\s+/g, '')) ||
        (c.importedContact.email && imp.email && c.importedContact.email.toLowerCase() === imp.email.toLowerCase())
      );

      return {
        ...imp,
        resolution: matchedConflict ? matchedConflict.resolution : 'MERGE'
      };
    });

    onAddBulkContacts(finalContacts, dedupStrategy, targetGroupIds);

    // Reset Import Wizard and Modal
    setShowSmartResolutionModal(false);
    setShowImportModal(false);
    setImportStep(1);
    setParsedHeaders([]);
    setParsedRows([]);
    setImportNewGroupName('');
    setSmartConflicts([]);
  };

  // Execute Final Import from Step 4 or launch Smart Resolution if conflicts found
  const handleExecuteImport = () => {
    const contactsToImport = buildPreparedContactsToImport();
    const conflicts = buildSmartConflictsList(contactsToImport);

    if (conflicts.length > 0) {
      setSmartConflicts(conflicts);
      setShowSmartResolutionModal(true);
    } else {
      let targetGroupIds = [...importSelectedGroupIds];
      if (importNewGroupName.trim()) {
        const newGrpId = `list-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newGrp: ContactList = {
          id: newGrpId,
          tenantId: activeTenant?.id || 't-safaricom-sacco',
          name: importNewGroupName.trim(),
          description: `Imported group generated on ${new Date().toLocaleDateString()}`,
          type: 'GROUP',
          category: importNewGroupCategory,
          contactCount: parsedRows.length,
          createdAt: new Date().toISOString()
        };
        if (onAddContactList) onAddContactList(newGrp);
        targetGroupIds.push(newGrpId);
      }

      onAddBulkContacts(contactsToImport, dedupStrategy, targetGroupIds);

      setShowImportModal(false);
      setImportStep(1);
      setParsedHeaders([]);
      setParsedRows([]);
      setImportNewGroupName('');
    }
  };

  // Count Duplicates in Preview
  const duplicateImportCount = useMemo(() => {
    if (parsedRows.length === 0) return 0;
    const phoneIdxHeader = Object.entries(columnMappings).find(([_, v]) => v === 'phoneNumber')?.[0];
    const emailIdxHeader = Object.entries(columnMappings).find(([_, v]) => v === 'email')?.[0];

    return parsedRows.filter(r => {
      const p = phoneIdxHeader ? r[phoneIdxHeader] : '';
      const e = emailIdxHeader ? r[emailIdxHeader] : '';
      return tenantContacts.some(c => 
        (p && c.phoneNumber.replace(/\s+/g, '') === p.replace(/\s+/g, '')) ||
        (e && c.email.toLowerCase() === e.toLowerCase())
      );
    }).length;
  }, [parsedRows, columnMappings, tenantContacts]);

  // Simulate CRM Sync Action
  const handleSyncCrm = (crmName: string) => {
    setSyncingCrm(crmName);
    setTimeout(() => {
      // Create mock synced records
      const crmContacts: Contact[] = [
        {
          id: `crm-${Date.now()}-1`,
          tenantId: activeTenant?.id || 't-safaricom-sacco',
          firstName: 'Wanjiku',
          lastName: 'Munge',
          phoneNumber: '+254711998877',
          email: `wanjiku.${crmName.toLowerCase()}@sacco.co.ke`,
          company: `${crmName} Sync Enterprise`,
          department: 'Executive Board',
          position: 'Managing Partner',
          location: 'Nairobi',
          gender: 'Female',
          tags: [crmName, 'CRM Synced'],
          createdAt: new Date().toISOString()
        },
        {
          id: `crm-${Date.now()}-2`,
          tenantId: activeTenant?.id || 't-safaricom-sacco',
          firstName: 'Hassan',
          lastName: 'Abdi',
          phoneNumber: '+254733112233',
          email: `hassan.${crmName.toLowerCase()}@cooperative.or.ke`,
          company: `${crmName} Global Partners`,
          department: 'Supply Chain',
          position: 'Director of Procurement',
          location: 'Mombasa',
          gender: 'Male',
          tags: [crmName, 'CRM Synced'],
          createdAt: new Date().toISOString()
        }
      ];

      onAddBulkContacts(crmContacts, 'MERGE');
      setSyncingCrm(null);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {activeTenant?.name || 'Safaricom Investment Sacco'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono uppercase">Multi-Tenant Isolation Active</span>
          </div>
          <h1 className="text-2xl font-black font-sans text-slate-100 tracking-tight">Contact & Audience Management</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Directory for segmenting customer bases, mapping custom fields, managing unlimited audience groups, and deduplicating records.
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('CONTACTS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                viewMode === 'CONTACTS' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/15' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Contacts ({tenantContacts.length})
            </button>
            <button
              onClick={() => setViewMode('LISTS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                viewMode === 'LISTS' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/15' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              Audience Groups ({tenantGroups.length})
            </button>
            <button
              onClick={() => setViewMode('INTEGRATIONS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-2 ${
                viewMode === 'INTEGRATIONS' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/15' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Link2 className="w-4 h-4" />
              CRM Sync & API
            </button>
          </div>

          {viewMode === 'CONTACTS' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setImportStep(1); setShowImportModal(true); }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                Import Contacts
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20 hover:brightness-110 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                New Contact
              </button>
            </div>
          )}

          {viewMode === 'LISTS' && (
            <button
              onClick={() => setShowListModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20 hover:brightness-110 transition-all"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Create Audience Group
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: CONTACTS DIRECTORY */}
      {viewMode === 'CONTACTS' && (
        <div className="space-y-4">
          {/* Multi-Filter Search Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/50 border border-slate-850 rounded-2xl p-4">
            {/* Search Input */}
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, company..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Audience Group Filter */}
            <div>
              <select
                value={selectedGroupFilter}
                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">All Audience Groups ({tenantGroups.length})</option>
                {tenantGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({g.contactCount || 0})</option>
                ))}
              </select>
            </div>

            {/* Tag Filter */}
            <div>
              <select
                value={selectedTagFilter}
                onChange={(e) => setSelectedTagFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">All Categories / Tags ({allTags.length})</option>
                {allTags.map(t => (
                  <option key={t} value={t}>Tag: {t}</option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div className="flex items-center gap-2">
              <select
                value={selectedLocationFilter}
                onChange={(e) => setSelectedLocationFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">All Locations ({allLocations.length})</option>
                {allLocations.map(l => (
                  <option key={l} value={l}>Location: {l}</option>
                ))}
              </select>

              <button
                onClick={() => handleExportCSV(filteredContacts)}
                title="Export Filtered CSV"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Floating Bulk Action Controls */}
          {selectedContactIds.length > 0 && (
            <div className="bg-gradient-to-r from-cyan-950/80 to-indigo-950/80 border border-cyan-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-4 shadow-xl animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 bg-cyan-500 text-slate-950 rounded-lg text-xs font-black flex items-center justify-center">
                  {selectedContactIds.length}
                </span>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">Contacts Selected for Batch Actions</h4>
                  <p className="text-[10px] text-slate-400">Apply group assignments, export, or delete selected records simultaneously.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowBulkActionModal('ASSIGN')}
                  className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add to Group(s)
                </button>
                <button
                  onClick={() => setShowBulkActionModal('REMOVE')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-rose-400" /> Remove from Group(s)
                </button>
                <button
                  onClick={() => handleExportCSV(tenantContacts.filter(c => selectedContactIds.includes(c.id)))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" /> Export Selected
                </button>
                <button
                  onClick={() => setShowBulkActionModal('DELETE')}
                  className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                </button>
              </div>
            </div>
          )}

          {/* Contacts Table */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3.5 w-10 text-center">
                      <button onClick={handleSelectAll} className="cursor-pointer text-slate-400 hover:text-cyan-400">
                        {selectedContactIds.length > 0 && selectedContactIds.length === filteredContacts.length ? (
                          <CheckSquare className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-3.5">Contact & Position</th>
                    <th className="p-3.5">Phone Number</th>
                    <th className="p-3.5">Email</th>
                    <th className="p-3.5">Department / City</th>
                    <th className="p-3.5">Assigned Audience Groups</th>
                    <th className="p-3.5">Tags</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60 font-sans">
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-500">
                        <div className="max-w-xs mx-auto space-y-2">
                          <Users className="w-8 h-8 text-slate-600 mx-auto" />
                          <p className="font-bold text-slate-300">No contacts match filter criteria</p>
                          <p className="text-[11px]">Try searching or click "Import Contacts" to load new records.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((contact) => {
                      const isSelected = selectedContactIds.includes(contact.id);
                      const assignedGroupIds = contact.groupIds || contact.listIds || [];

                      return (
                        <tr key={contact.id} className={`hover:bg-slate-850/40 transition-colors ${isSelected ? 'bg-cyan-500/5' : ''}`}>
                          <td className="p-3.5 text-center">
                            <button onClick={() => handleToggleSelectRow(contact.id)} className="cursor-pointer">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-cyan-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-600 hover:text-slate-400" />
                              )}
                            </button>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-100">{contact.firstName} {contact.lastName}</div>
                            {(contact.company || contact.position) && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Briefcase className="w-3 h-3 text-slate-500" />
                                {contact.position ? `${contact.position} at ` : ''}{contact.company}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 font-mono text-cyan-400 font-semibold">
                            {contact.phoneNumber}
                          </td>
                          <td className="p-3.5 text-slate-300">
                            {contact.email ? (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-500" />
                                {contact.email}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-mono">—</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div>{contact.department || '—'}</div>
                            {contact.location && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-0.5 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-600" /> {contact.location}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {assignedGroupIds.length === 0 ? (
                                <span className="text-[10px] text-slate-600 font-mono">Unassigned</span>
                              ) : (
                                assignedGroupIds.map(gid => {
                                  const groupObj = tenantGroups.find(g => g.id === gid);
                                  return (
                                    <span key={gid} className="text-[9px] font-mono font-semibold px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-md">
                                      {groupObj?.name || gid}
                                    </span>
                                  );
                                })
                              )}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="flex flex-wrap gap-1">
                              {(contact.tags || []).map(tag => (
                                <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => onDeleteContact(contact.id)}
                              className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete Contact"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: AUDIENCE GROUPS & SEGMENTS */}
      {viewMode === 'LISTS' && (
        <div className="space-y-6">
          {/* Quick Predefined Group Templates */}
          <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" /> Predefined Audience Containers
                </h3>
                <p className="text-xs text-slate-400">Instantly create standard audience categories for multi-segment marketing campaigns.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {PREDEFINED_GROUP_TYPES.map((preset) => (
                <button
                  key={preset.category}
                  onClick={() => handleQuickGroupCreate(preset)}
                  className="p-3 bg-slate-950 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-left transition-all hover:scale-[1.01] group cursor-pointer"
                >
                  <div className="text-lg mb-1">{preset.icon}</div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-400">{preset.name}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Active Audience Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenantGroups.map((group) => {
              // Calculate real contact count belonging to this group
              const countInGroup = tenantContacts.filter(c => (c.groupIds || c.listIds || []).includes(group.id)).length;

              return (
                <div key={group.id} className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-4 hover:border-slate-800 transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase border bg-cyan-500/10 border-cyan-500/20 text-cyan-400">
                        {group.category || group.type}
                      </span>

                      {onDeleteContactList && (
                        <button
                          onClick={() => onDeleteContactList(group.id)}
                          className="text-slate-600 hover:text-rose-400 p-1 cursor-pointer"
                          title="Delete Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-100">{group.name}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {group.description || 'Custom audience group built for targeted campaign dispatch.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-900 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500 font-mono">Assigned Contacts</div>
                      <div className="text-sm font-black font-mono text-cyan-400">{countInGroup} Subscribers</div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedGroupFilter(group.id);
                        setViewMode('CONTACTS');
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      View Contacts <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: CRM SYNC & REST API INTEGRATIONS */}
      {viewMode === 'INTEGRATIONS' && (
        <div className="space-y-6">
          {/* CRM Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'HubSpot CRM', desc: 'Sync marketing leads, deals, and customer contacts automatically.', color: 'from-orange-500 to-amber-500' },
              { name: 'Salesforce Enterprise', desc: 'Sync corporate accounts, opportunities, and executive profiles.', color: 'from-blue-500 to-cyan-500' },
              { name: 'Zoho CRM', desc: 'Bi-directional sync of sales leads and regional cooperative lists.', color: 'from-emerald-500 to-teal-500' },
              { name: 'Google Contacts', desc: 'Direct OAuth sync with GSuite organization directories.', color: 'from-rose-500 to-pink-500' },
              { name: 'Zapier & Make', desc: 'Trigger automated contact ingestion via Webhook workflows.', color: 'from-purple-500 to-indigo-500' }
            ].map(crm => (
              <div key={crm.name} className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${crm.color} flex items-center justify-center font-bold text-slate-950 text-sm shadow-md`}>
                    {crm.name[0]}
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-100">{crm.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{crm.desc}</p>
                </div>

                <button
                  onClick={() => handleSyncCrm(crm.name)}
                  disabled={syncingCrm === crm.name}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingCrm === crm.name ? 'animate-spin text-cyan-400' : ''}`} />
                  {syncingCrm === crm.name ? 'Syncing Audience Records...' : 'Sync Contacts Now'}
                </button>
              </div>
            ))}
          </div>

          {/* REST API Import Section */}
          <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400">
              <FileCode className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-100">REST API Programmatic Import Endpoint</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Incorporate real-time subscriber registration directly into your web app or mobile app backend using our secure REST API:
            </p>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl font-mono text-xs text-slate-300 space-y-2 overflow-x-auto">
              <div className="text-slate-500">// Programmatic Contact Ingestion API</div>
              <div className="text-cyan-400">POST /api/contacts/bulk</div>
              <pre className="text-slate-400 text-[11px] leading-relaxed">
{`curl -X POST https://${activeTenant?.subdomain || 'app'}.disyo2soltqzaebhs5mhna.run.app/api/contacts/bulk \\
  -H "Authorization: Bearer live_sk_4f89a91c" \\
  -H "Content-Type: application/json" \\
  -d '{
    "strategy": "MERGE",
    "targetGroupIds": ["list-1"],
    "contacts": [
      {
        "firstName": "Grace",
        "lastName": "Wambui",
        "phoneNumber": "+254712998811",
        "email": "wambui@sacco.co.ke",
        "company": "Safaricom Sacco",
        "department": "Operations",
        "tags": ["API Imported"]
      }
    ]
  }'`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SINGLE CONTACT ADD */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" /> Create New Contact Record
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formDuplicateWarning && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                {formDuplicateWarning}
              </div>
            )}

            <form onSubmit={handleSingleAdd} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    placeholder="e.g., Kamau"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    placeholder="e.g., Wanjiku"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Phone Number (E.164) *</label>
                  <input
                    type="text"
                    required
                    value={formPhoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="+254712345678"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Company</label>
                  <input
                    type="text"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="Safaricom Sacco"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Department</label>
                  <input
                    type="text"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    placeholder="Finance"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Position / Role</label>
                  <input
                    type="text"
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value)}
                    placeholder="Manager"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Location / City</label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Nairobi"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Gender</label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formDOB}
                    onChange={(e) => setFormDOB(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Assign Audience Groups */}
              <div>
                <label className="block text-slate-400 mb-1">Assign to Audience Groups</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-xl">
                  {tenantGroups.map(g => {
                    const isChecked = formSelectedGroupIds.includes(g.id);
                    return (
                      <label key={g.id} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setFormSelectedGroupIds(prev => 
                              isChecked ? prev.filter(x => x !== g.id) : [...prev, g.id]
                            );
                          }}
                          className="rounded border-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
                        />
                        <span className="truncate">{g.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/15 cursor-pointer hover:brightness-110 transition-all"
              >
                Save Contact Record
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE AUDIENCE GROUP */}
      {showListModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-cyan-400" /> Create Audience Container
              </h3>
              <button onClick={() => setShowListModal(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Group Category</label>
                <select
                  value={listCategory}
                  onChange={(e) => setListCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Customers">Customers</option>
                  <option value="Staff">Staff</option>
                  <option value="VIP Clients">VIP Clients</option>
                  <option value="Suppliers">Suppliers</option>
                  <option value="Students">Students</option>
                  <option value="Parents">Parents</option>
                  <option value="Marketing Subscribers">Marketing Subscribers</option>
                  <option value="Custom">Custom Group</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Audience Group Name *</label>
                <input
                  type="text"
                  required
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="e.g., Premium Farmers Division"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={listDescription}
                  onChange={(e) => setListDescription(e.target.value)}
                  placeholder="Targeting notes for marketing dispatch..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/15 cursor-pointer hover:brightness-110 transition-all"
              >
                Create Audience Group
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: WIZARD IMPORT CONTACTS (CSV/Excel/Paste -> Column Mapping -> Group Destination -> Dedup) */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-cyan-400" /> Multi-Source Contact Import Engine
                </h3>
                <p className="text-[11px] text-slate-400">Step {importStep} of 4: {
                  importStep === 1 ? 'Source Data Upload' :
                  importStep === 2 ? 'Column Mapping Matrix' :
                  importStep === 3 ? 'Target Audience Group Destination' :
                  'Duplicate Resolution Strategy'
                }</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* STEP 1: CHOOSE IMPORT METHOD & FILE/PASTE INPUT */}
            {importStep === 1 && (
              <div className="space-y-4 text-xs">
                <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl w-fit">
                  <button
                    onClick={() => setImportMethod('FILE')}
                    className={`px-4 py-2 rounded-lg font-bold cursor-pointer transition-all ${
                      importMethod === 'FILE' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    CSV / Excel File (.xlsx, .csv)
                  </button>
                  <button
                    onClick={() => setImportMethod('PASTE')}
                    className={`px-4 py-2 rounded-lg font-bold cursor-pointer transition-all ${
                      importMethod === 'PASTE' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Copy & Paste Raw Text
                  </button>
                </div>

                {importMethod === 'FILE' ? (
                  <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-950/50 rounded-2xl p-8 text-center space-y-3 transition-colors">
                    <FileSpreadsheet className="w-10 h-10 text-cyan-400 mx-auto animate-bounce" />
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm">Upload Spreadsheet File</h4>
                      <p className="text-slate-400 text-xs mt-1">Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) files with headers.</p>
                    </div>

                    <label className="inline-block px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl cursor-pointer shadow-md shadow-cyan-500/15">
                      Select File From Device
                      <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-slate-400">Paste Comma, Tab, or Pipe Delimited Contact Data:</label>
                    <textarea
                      rows={7}
                      value={rawPasteText}
                      onChange={(e) => setRawPasteText(e.target.value)}
                      className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      onClick={handleParseTextPaste}
                      className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl cursor-pointer"
                    >
                      Parse Raw Text ({rawPasteText.trim().split('\n').length - 1} records)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: COLUMN MAPPING */}
            {importStep === 2 && (
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <h4 className="font-bold text-slate-200">Map File Columns to Database Fields</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">Found {parsedHeaders.length} headers and {parsedRows.length} sample rows.</p>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {parsedHeaders.map((header) => (
                    <div key={header} className="grid grid-cols-2 gap-3 items-center bg-slate-950/70 p-2.5 border border-slate-850 rounded-xl">
                      <div>
                        <span className="font-bold text-slate-200">{header}</span>
                        <div className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                          Sample: {parsedRows[0]?.[header] || 'N/A'}
                        </div>
                      </div>

                      <select
                        value={columnMappings[header] || 'ignore'}
                        onChange={(e) => setColumnMappings({ ...columnMappings, [header]: e.target.value })}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-cyan-400 font-semibold focus:border-cyan-500 focus:outline-none"
                      >
                        {MAPPING_FIELDS.map(f => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-800">
                  <button onClick={() => setImportStep(1)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl cursor-pointer">
                    Back
                  </button>
                  <button onClick={() => setImportStep(3)} className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl cursor-pointer">
                    Continue to Audience Groups →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: AUDIENCE GROUP DESTINATION */}
            {importStep === 3 && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-slate-200">Assign Imported Contacts to Audience Groups</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">Select existing audience groups or create a new group on the fly.</p>
                </div>

                <div className="space-y-3">
                  <label className="block text-slate-400">Select Existing Groups:</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    {tenantGroups.map(g => {
                      const isChecked = importSelectedGroupIds.includes(g.id);
                      return (
                        <label key={g.id} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setImportSelectedGroupIds(prev =>
                                isChecked ? prev.filter(x => x !== g.id) : [...prev, g.id]
                              );
                            }}
                            className="rounded border-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
                          />
                          <span className="truncate">{g.name} ({g.contactCount})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <label className="block text-slate-300 font-bold">Or Create New Group On-The-Fly:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={importNewGroupName}
                      onChange={(e) => setImportNewGroupName(e.target.value)}
                      placeholder="e.g., Imported July 2026 Batch"
                      className="col-span-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                    />
                    <select
                      value={importNewGroupCategory}
                      onChange={(e) => setImportNewGroupCategory(e.target.value as any)}
                      className="px-2 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                    >
                      <option value="Customers">Customers</option>
                      <option value="Staff">Staff</option>
                      <option value="VIP Clients">VIP Clients</option>
                      <option value="Suppliers">Suppliers</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-800">
                  <button onClick={() => setImportStep(2)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl cursor-pointer">
                    Back
                  </button>
                  <button onClick={() => setImportStep(4)} className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl cursor-pointer">
                    Continue to Duplicate Check →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: DUPLICATE RESOLUTION & COMMIT */}
            {importStep === 4 && (
              <div className="space-y-4 text-xs">
                <div className={`p-4 rounded-xl border ${
                  duplicateImportCount > 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <AlertCircle className="w-5 h-5" />
                    {duplicateImportCount > 0 ? `${duplicateImportCount} Duplicate Phone/Email Matches Found` : 'No Duplicates Detected'}
                  </div>
                  <p className="text-xs mt-1 leading-relaxed opacity-90">
                    {duplicateImportCount > 0
                      ? 'Some records in your import file share phone numbers or email addresses with existing directory contacts.'
                      : 'All records in your import file are unique and ready to be inserted.'
                    }
                  </p>
                </div>

                {duplicateImportCount > 0 && (
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-cyan-300 font-semibold flex items-center gap-2">
                      <GitMerge className="w-4 h-4 text-cyan-400" /> Inspect side-by-side field diffs & choose per-record actions:
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenSmartResolution}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-bold rounded-lg shadow cursor-pointer text-xs flex items-center gap-1.5 hover:brightness-110"
                    >
                      <GitMerge className="w-3.5 h-3.5" /> Launch Smart Resolution Dialog
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 mb-2">Select Default Resolution Strategy:</label>
                  <div className="space-y-2">
                    {[
                      { key: 'MERGE', title: 'Merge & Update Details (Recommended)', desc: 'Update missing contact fields and add new audience group memberships while preserving existing data.' },
                      { key: 'SKIP', title: 'Skip Duplicate Records', desc: 'Ignore records that match existing phone numbers/emails and import only brand new contacts.' },
                      { key: 'OVERWRITE', title: 'Overwrite Existing Records', desc: 'Completely replace existing database contact fields with newly imported row values.' }
                    ].map(strat => (
                      <label key={strat.key} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        dedupStrategy === strat.key ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300' : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}>
                        <input
                          type="radio"
                          name="strat"
                          checked={dedupStrategy === strat.key}
                          onChange={() => setDedupStrategy(strat.key as any)}
                          className="mt-1 text-cyan-500 focus:ring-0"
                        />
                        <div>
                          <div className="font-bold text-slate-200">{strat.title}</div>
                          <div className="text-[11px] opacity-80 mt-0.5">{strat.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between pt-3 border-t border-slate-800">
                  <button onClick={() => setImportStep(3)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl cursor-pointer">
                    Back
                  </button>
                  <button
                    onClick={handleExecuteImport}
                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/20 cursor-pointer hover:brightness-110"
                  >
                    Execute Import ({parsedRows.length} Contacts)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: SMART DUPLICATE RESOLUTION DIALOG */}
      {showSmartResolutionModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 max-h-[92vh] flex flex-col justify-between">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-4 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
                    <GitMerge className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                      Smart Duplicate Resolution Engine
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                        {smartConflicts.length} Conflicting Record(s)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Side-by-side field comparison of existing directory records vs incoming import rows. Choose resolution action per record or apply a batch action.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSmartResolutionModal(false)}
                className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Batch Action Toolbar & Filters */}
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-cyan-400" /> Apply Batch Resolution to All {smartConflicts.length} Conflicts:
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleSetAllConflictResolutions('MERGE')}
                    className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                  >
                    <GitMerge className="w-3.5 h-3.5" /> Merge All (Keep Newest)
                  </button>
                  <button
                    onClick={() => handleSetAllConflictResolutions('SKIP')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Ban className="w-3.5 h-3.5 text-slate-400" /> Skip All Duplicates
                  </button>
                  <button
                    onClick={() => handleSetAllConflictResolutions('OVERWRITE')}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Overwrite All
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowOnlyDiffFields(!showOnlyDiffFields)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                      showOnlyDiffFields ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {showOnlyDiffFields ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {showOnlyDiffFields ? 'Showing Conflicting Fields Only' : 'Showing All Fields'}
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={conflictSearchQuery}
                    onChange={(e) => setConflictSearchQuery(e.target.value)}
                    placeholder="Search conflicts by name or phone..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Scrollable Conflict List */}
            <div className="overflow-y-auto space-y-4 pr-1 flex-1 min-h-[250px]">
              {smartConflicts
                .filter(conflict => {
                  const q = conflictSearchQuery.trim().toLowerCase();
                  if (!q) return true;
                  const name = `${conflict.existingContact.firstName} ${conflict.existingContact.lastName}`.toLowerCase();
                  const phone = conflict.existingContact.phoneNumber;
                  const email = (conflict.existingContact.email || '').toLowerCase();
                  return name.includes(q) || phone.includes(q) || email.includes(q);
                })
                .map((conflict, index) => {
                  const diffCount = conflict.diffFields.filter(f => f.isDifferent).length;
                  const visibleFields = showOnlyDiffFields 
                    ? conflict.diffFields.filter(f => f.isDifferent)
                    : conflict.diffFields;

                  return (
                    <div key={conflict.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3.5 hover:border-slate-700 transition-all">
                      {/* Conflict Card Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-850 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-800 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center">
                            #{index + 1}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                              {conflict.existingContact.firstName} {conflict.existingContact.lastName}
                              <span className="text-[10px] font-mono text-slate-400 font-normal">
                                ({conflict.existingContact.phoneNumber})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span>Match on Phone/Email</span>
                              <span>•</span>
                              <span className="text-amber-400 font-semibold">{diffCount} field(s) conflict</span>
                            </div>
                          </div>
                        </div>

                        {/* Current Resolution Pill */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${
                            conflict.resolution === 'MERGE' ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' :
                            conflict.resolution === 'SKIP' ? 'bg-slate-800 border-slate-700 text-slate-400' :
                            'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          }`}>
                            {conflict.resolution === 'MERGE' ? '🔀 Merge (Keep Newest)' :
                             conflict.resolution === 'SKIP' ? '🚫 Skip Duplicate' :
                             '✏️ Overwrite Record'}
                          </span>
                        </div>
                      </div>

                      {/* Side-By-Side Comparison Grid */}
                      <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-900/60 text-xs">
                        <div className="grid grid-cols-12 bg-slate-900 p-2 border-b border-slate-800 font-bold text-[10px] text-slate-400 uppercase tracking-wider">
                          <div className="col-span-3">Field</div>
                          <div className="col-span-4 text-slate-300 border-l border-slate-800 pl-2">Existing Directory Record</div>
                          <div className="col-span-5 text-cyan-400 border-l border-slate-800 pl-2">Incoming Import Row</div>
                        </div>

                        <div className="divide-y divide-slate-850 max-h-48 overflow-y-auto">
                          {visibleFields.length === 0 ? (
                            <div className="p-3 text-center text-slate-500 text-[11px] italic">
                              No conflicting values found across fields for this contact.
                            </div>
                          ) : (
                            visibleFields.map((field) => (
                              <div
                                key={field.key}
                                className={`grid grid-cols-12 p-2 items-center text-xs transition-colors ${
                                  field.isDifferent ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-slate-850/50'
                                }`}
                              >
                                <div className="col-span-3 font-semibold text-slate-300 flex items-center gap-1 truncate">
                                  {field.label}
                                  {field.isDifferent && (
                                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-mono shrink-0">Diff</span>
                                  )}
                                </div>
                                <div className="col-span-4 border-l border-slate-850 pl-2 text-slate-400 truncate">
                                  {field.existingVal ? field.existingVal : <span className="text-slate-600 italic">Empty</span>}
                                </div>
                                <div className={`col-span-5 border-l border-slate-850 pl-2 font-medium truncate ${
                                  field.isDifferent ? 'text-cyan-300 font-bold' : 'text-slate-400'
                                }`}>
                                  {field.importedVal ? field.importedVal : <span className="text-slate-600 italic">Empty</span>}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Per-Record Resolution Strategy Picker */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-400">Choose Resolution Action specifically for this Record:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleSetSingleConflictResolution(conflict.id, 'MERGE')}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                              conflict.resolution === 'MERGE'
                                ? 'bg-cyan-500/15 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/50'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <div className="font-bold flex items-center gap-1.5 text-xs">
                              <GitMerge className="w-3.5 h-3.5 text-cyan-400" /> Merge (Keep Newest)
                            </div>
                            <div className="text-[10px] opacity-75 mt-1 leading-tight">
                              Fill empty fields & update values while keeping existing tags/groups.
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetSingleConflictResolution(conflict.id, 'SKIP')}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                              conflict.resolution === 'SKIP'
                                ? 'bg-slate-800 border-slate-600 text-slate-200 ring-1 ring-slate-500'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <div className="font-bold flex items-center gap-1.5 text-xs">
                              <Ban className="w-3.5 h-3.5 text-slate-400" /> Skip Duplicate
                            </div>
                            <div className="text-[10px] opacity-75 mt-1 leading-tight">
                              Ignore incoming row completely. Leave directory record untouched.
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetSingleConflictResolution(conflict.id, 'OVERWRITE')}
                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                              conflict.resolution === 'OVERWRITE'
                                ? 'bg-amber-500/15 border-amber-500 text-amber-200 ring-1 ring-amber-500/50'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <div className="font-bold flex items-center gap-1.5 text-xs">
                              <RefreshCw className="w-3.5 h-3.5 text-amber-400" /> Overwrite
                            </div>
                            <div className="text-[10px] opacity-75 mt-1 leading-tight">
                              Replace existing directory record completely with incoming row.
                            </div>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setShowSmartResolutionModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Return to Wizard
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExecuteSmartImport}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/20 text-xs cursor-pointer hover:brightness-110 flex items-center gap-2"
                >
                  <CheckCheck className="w-4 h-4" /> Confirm & Execute Resolved Import ({parsedRows.length} Contacts)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BULK ACTION TARGET MODAL */}
      {showBulkActionModal && showBulkActionModal !== 'DELETE' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100">
                {showBulkActionModal === 'ASSIGN' ? 'Add Selected Contacts to Groups' : 'Remove Selected Contacts from Groups'}
              </h3>
              <button onClick={() => setShowBulkActionModal(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-slate-400">Target Audience Groups:</label>
              <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-slate-950 border border-slate-800 rounded-xl">
                {tenantGroups.map(g => (
                  <label key={g.id} className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="checkbox"
                      id={`bulk-grp-${g.id}`}
                      className="rounded border-slate-800 text-cyan-500 focus:ring-0 cursor-pointer"
                    />
                    <span>{g.name} ({g.contactCount})</span>
                  </label>
                ))}
              </div>

              <button
                onClick={() => {
                  const checkedIds = tenantGroups
                    .filter(g => (document.getElementById(`bulk-grp-${g.id}`) as HTMLInputElement)?.checked)
                    .map(g => g.id);
                  handleConfirmBatchAction(checkedIds);
                }}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-md cursor-pointer"
              >
                Apply to {selectedContactIds.length} Selected Contacts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIRM BATCH DELETE */}
      {showBulkActionModal === 'DELETE' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-500/30 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-sm font-bold text-slate-100">Confirm Batch Delete</h3>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-200">{selectedContactIds.length}</strong> selected contacts? This action is permanent.
            </p>

            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setShowBulkActionModal(null)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl text-xs cursor-pointer">
                Cancel
              </button>
              <button
                onClick={() => handleConfirmBatchAction([])}
                className="px-4 py-2 bg-rose-500 text-white font-bold rounded-xl text-xs cursor-pointer hover:bg-rose-600"
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
