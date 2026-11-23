import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, CheckCircle2, Save, Trash2 } from 'lucide-react';
import { api } from '../api';
import { TRANSLATIONS, type AppLanguage } from '../i18n';
import type { StudentProfile } from '../types';
import { StudentAvatar } from './StudentAvatar';

const INDIAN_STATES = [
  'Karnataka',
  'Maharashtra',
  'Tamil Nadu',
  'Andhra Pradesh',
  'Telangana',
  'Kerala',
  'Delhi',
  'Uttar Pradesh',
  'Rajasthan',
  'Gujarat',
  'West Bengal',
  'Madhya Pradesh',
  'Bihar',
  'Odisha',
  'Punjab',
  'Haryana',
  'Assam',
  'Jharkhand',
  'Chhattisgarh',
  'Uttarakhand',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Goa',
  'Other State / UT',
];

const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'EWS', 'Minority'];

const EDUCATION_LEVELS = [
  'Pre-Matric (Class 9-10)',
  'Post-Matric (Class 11-12 / PUC)',
  'Diploma / Polytechnic',
  'Undergraduate (UG)',
  'Postgraduate (PG)',
  'PhD / Research',
];

interface StudentProfileFormProps {
  token: string;
  profile: StudentProfile;
  language: AppLanguage;
  onUpdated: (profile: StudentProfile) => void;
}

function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid or unsupported image file.'));
      img.onload = () => {
        const maxSide = 256;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas rendering unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export function StudentProfileForm({
  token,
  profile,
  language,
  onUpdated,
}: StudentProfileFormProps) {
  const t = TRANSLATIONS[language];
  const [form, setForm] = useState<StudentProfile>(profile);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handlePhotoSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSavedNotice(false);
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Please upload a PNG, JPG, WEBP, or GIF image.');
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      const next = { ...form, profile_pic_url: dataUrl };
      setForm(next);
      // Persist immediately so sidebar/header avatar updates right away
      const res = await api.updateProfile(token, next);
      onUpdated(res.profile);
      setForm(res.profile);
      setSavedNotice(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process profile picture.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemovePhoto() {
    setError(null);
    setSavedNotice(false);
    const next = { ...form, profile_pic_url: '' };
    setForm(next);
    try {
      const res = await api.updateProfile(token, next);
      onUpdated(res.profile);
      setForm(res.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove profile photo.');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSavedNotice(false);
    try {
      const res = await api.updateProfile(token, form);
      onUpdated(res.profile);
      setForm(res.profile);
      setSavedNotice(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-800 dark:focus:border-blue-500 focus:outline-none';
  const labelCls = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5';

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          {t.profileTitle}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t.profileSub}</p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-300">
          {error}
        </div>
      )}
      {savedNotice && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {t.profileSavedBanner}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6"
      >
        {/* Profile Photo Picker */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 border-b border-slate-100 dark:border-slate-800 pb-6">
          <StudentAvatar name={form.full_name} src={form.profile_pic_url} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t.profilePhotoLabel}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {t.profilePhotoHint}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handlePhotoSelected}
                className="hidden"
                id="profile-photo-upload"
              />
              <label
                htmlFor="profile-photo-upload"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <Camera className="h-3.5 w-3.5" />
                {t.uploadPhotoBtn}
              </label>
              {form.profile_pic_url && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t.removePhotoBtn}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Full Name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Domicile State / UT</label>
            <select
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className={inputCls}
            >
              <option value="">Select State / UT</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>District</label>
            <input
              type="text"
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              placeholder="e.g. Bengaluru Urban"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Social Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className={inputCls}
            >
              <option value="">Select Category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className={inputCls}
            >
              <option value="">Select Gender</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Annual Family Income (INR)</label>
            <input
              type="number"
              min={0}
              step={1000}
              value={form.annual_family_income ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  annual_family_income: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              placeholder="e.g. 220000"
              className={`${inputCls} tabular-nums`}
            />
          </div>

          <div>
            <label className={labelCls}>Current Education Level</label>
            <select
              value={form.education_level}
              onChange={(e) => setForm({ ...form, education_level: e.target.value })}
              className={inputCls}
            >
              <option value="">Select Level</option>
              {EDUCATION_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Course / Degree Stream</label>
            <input
              type="text"
              value={form.course}
              onChange={(e) => setForm({ ...form, course: e.target.value })}
              placeholder="e.g. B.E. Computer Science / B.Sc / MBBS"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Previous Qualifying Exam Percentage (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={form.previous_percentage ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  previous_percentage: e.target.value === '' ? null : Number(e.target.value),
                })
              }
              placeholder="e.g. 82.5"
              className={`${inputCls} tabular-nums`}
            />
          </div>

          <div>
            <label className={labelCls}>Academic Year</label>
            <input
              type="text"
              value={form.academic_year}
              onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
              placeholder="2026-27"
              className={`${inputCls} tabular-nums`}
            />
          </div>

          <div>
            <label className={labelCls}>Institution Name</label>
            <input
              type="text"
              value={form.institution_name}
              onChange={(e) => setForm({ ...form, institution_name: e.target.value })}
              placeholder="e.g. Visvesvaraya Technological University"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Institution Type</label>
            <select
              value={form.institution_type}
              onChange={(e) => setForm({ ...form, institution_type: e.target.value })}
              className={inputCls}
            >
              <option value="">Select Type</option>
              <option value="Government">Government</option>
              <option value="Government Aided">Government Aided</option>
              <option value="Private Recognized (AICTE/UGC)">
                Private Recognized (AICTE/UGC)
              </option>
              <option value="Central University / INI">Central University / INI</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Minority Community Status</label>
            <select
              value={form.minority_status}
              onChange={(e) => setForm({ ...form, minority_status: e.target.value })}
              className={inputCls}
            >
              <option value="None">Not Applicable (None)</option>
              <option value="Muslim">Muslim</option>
              <option value="Christian">Christian</option>
              <option value="Sikh">Sikh</option>
              <option value="Buddhist">Buddhist</option>
              <option value="Jain">Jain</option>
              <option value="Parsi">Parsi</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Disability / PwD Status</label>
            <select
              value={form.disability_status}
              onChange={(e) => setForm({ ...form, disability_status: e.target.value })}
              className={inputCls}
            >
              <option value="None">None</option>
              <option value="Benchmark Disability (>= 40%)">
                Benchmark Disability (&ge; 40%)
              </option>
              <option value="Other Disability">Other Disability</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Hosteller or Day Scholar</label>
            <select
              value={form.hosteller_or_dayscholar}
              onChange={(e) => setForm({ ...form, hosteller_or_dayscholar: e.target.value })}
              className={inputCls}
            >
              <option value="">Select Status</option>
              <option value="Hosteller">Hosteller</option>
              <option value="Day Scholar">Day Scholar</option>
            </select>
          </div>

          <div className="flex items-center pt-6">
            <label className="inline-flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={form.first_generation}
                onChange={(e) => setForm({ ...form, first_generation: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-800 focus:ring-blue-800"
              />
              First-generation college learner in family
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-800 pt-5">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-800 dark:bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 dark:hover:bg-blue-500 disabled:opacity-60 transition-colors cursor-pointer"
          >
            <Save className="h-4 w-4" />
            {saving ? t.savingProfileBtn : t.saveProfileBtn}
          </button>
        </div>
      </form>
    </div>
  );
}
