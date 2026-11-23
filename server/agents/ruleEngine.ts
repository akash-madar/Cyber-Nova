import type {
  EligibilityCriterion,
  EligibilityOutcome,
  RuleCheckResult,
  ScholarshipRecord,
  StudentProfile,
} from '../types.ts';

const EDUCATION_RANK: Record<string, number> = {
  'pre-matric': 1,
  'class 9-10': 1,
  'class 10': 1,
  'post-matric (class 11-12 / puc)': 2,
  'class 11-12': 2,
  'puc': 2,
  'diploma / polytechnic': 3,
  'iti / vocational': 3,
  'undergraduate (ug)': 4,
  'undergraduate': 4,
  'bachelor': 4,
  'b.tech / b.e.': 4,
  'postgraduate (pg)': 5,
  'postgraduate': 5,
  'master': 5,
  'phd / research': 6,
  'doctoral': 6,
};

function normalizeEduRank(level: string): number | null {
  const lower = level.trim().toLowerCase();
  if (!lower || lower === 'not verified') return null;
  if (EDUCATION_RANK[lower] !== undefined) return EDUCATION_RANK[lower];
  if (lower.includes('pre-matric') || lower.includes('class 9') || lower.includes('class 10')) return 1;
  if (lower.includes('11') || lower.includes('12') || lower.includes('puc') || lower.includes('higher secondary')) return 2;
  if (lower.includes('diploma') || lower.includes('polytechnic') || lower.includes('iti')) return 3;
  if (lower.includes('undergraduate') || lower.includes('ug') || lower.includes('b.tech') || lower.includes('b.sc') || lower.includes('b.a') || lower.includes('b.com') || lower.includes('mbbs')) return 4;
  if (lower.includes('postgraduate') || lower.includes('pg') || lower.includes('master') || lower.includes('m.tech') || lower.includes('m.sc')) return 5;
  if (lower.includes('phd') || lower.includes('doctoral') || lower.includes('research')) return 6;
  return null;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

export interface DeterministicEvaluationResult {
  outcome: EligibilityOutcome;
  rule_checks: RuleCheckResult[];
  missing_fields: string[];
}

export function evaluateEligibilityDeterministic(
  profile: StudentProfile,
  scholarship: Omit<ScholarshipRecord, 'id' | 'task_id' | 'created_at'>,
  criteria: Omit<EligibilityCriterion, 'id' | 'scholarship_id'>
): DeterministicEvaluationResult {
  const checks: RuleCheckResult[] = [];
  const missingFields = new Set<string>();

  // 0. Check if official rules were verified by Agent 1
  if (!criteria.rules_verified) {
    checks.push({
      condition: 'Official Eligibility Rules Verification',
      official_rule: 'Verified rules required from official government portal',
      student_value: 'Profile available',
      status: 'UNVERIFIED_RULE',
      reason:
        'Official eligibility criteria could not be fully verified from primary government sources. Flagged instead of guessing.',
    });
  }

  // 1. State / Domicile check
  const allowedStates = criteria.allowed_states.map(normalizeText);
  const isAllIndia =
    allowedStates.length === 0 ||
    allowedStates.some((s) => s === 'all india' || s === 'all states' || s === 'india' || s === 'pan india');

  if (allowedStates.some((s) => s === 'not verified')) {
    checks.push({
      condition: 'State / Domicile',
      official_rule: 'Not verified',
      student_value: profile.state || 'Missing',
      status: 'UNVERIFIED_RULE',
      reason: 'State domicile requirement was not verified from the retrieved official source.',
    });
  } else if (!profile.state.trim()) {
    missingFields.add('state');
    checks.push({
      condition: 'State / Domicile',
      official_rule: criteria.allowed_states.join(', ') || 'All India',
      student_value: 'Not provided in student profile',
      status: 'MISSING_STUDENT_DATA',
      reason: 'Your domicile state is missing from your student profile.',
    });
  } else if (isAllIndia) {
    checks.push({
      condition: 'State / Domicile',
      official_rule: 'All India',
      student_value: profile.state,
      status: 'PASS',
      reason: `Scheme is open across India, covering ${profile.state}.`,
    });
  } else {
    const studentState = normalizeText(profile.state);
    const matched = allowedStates.some(
      (s) => s === studentState || s.includes(studentState) || studentState.includes(s)
    );
    checks.push({
      condition: 'State / Domicile',
      official_rule: criteria.allowed_states.join(', '),
      student_value: profile.state,
      status: matched ? 'PASS' : 'FAIL',
      reason: matched
        ? `Your domicile state (${profile.state}) matches the scheme requirement.`
        : `Scheme is restricted to ${criteria.allowed_states.join(', ')}, while your profile specifies ${profile.state}.`,
    });
  }

  // 2. Category check
  const allowedCats = criteria.allowed_categories.map(normalizeText);
  const isAllCats =
    allowedCats.length === 0 ||
    allowedCats.some((c) => c === 'all' || c === 'all categories' || c === 'general/all');

  if (allowedCats.some((c) => c === 'not verified')) {
    checks.push({
      condition: 'Social Category',
      official_rule: 'Not verified',
      student_value: profile.category || 'Missing',
      status: 'UNVERIFIED_RULE',
      reason: 'Eligible category list could not be verified from official guidelines.',
    });
  } else if (!profile.category.trim()) {
    missingFields.add('category');
    checks.push({
      condition: 'Social Category',
      official_rule: criteria.allowed_categories.join(', '),
      student_value: 'Not provided in student profile',
      status: 'MISSING_STUDENT_DATA',
      reason: 'Your social category (General / OBC / SC / ST / EWS / Minority) is missing.',
    });
  } else if (isAllCats) {
    checks.push({
      condition: 'Social Category',
      official_rule: 'All Categories',
      student_value: profile.category,
      status: 'PASS',
      reason: `Scheme is open to all categories including ${profile.category}.`,
    });
  } else {
    const studentCat = normalizeText(profile.category);
    const matched = allowedCats.some((c) => {
      if (c === studentCat) return true;
      if (studentCat.includes('obc') && (c.includes('obc') || c.includes('bc') || c.includes('backward'))) return true;
      if (studentCat === 'sc' && (c === 'sc' || c.includes('scheduled caste'))) return true;
      if (studentCat === 'st' && (c === 'st' || c.includes('scheduled tribe'))) return true;
      if (studentCat === 'ews' && (c.includes('ews') || c.includes('economically weaker'))) return true;
      if (studentCat.includes('minority') && c.includes('minority')) return true;
      return false;
    });
    checks.push({
      condition: 'Social Category',
      official_rule: criteria.allowed_categories.join(', '),
      student_value: profile.category,
      status: matched ? 'PASS' : 'FAIL',
      reason: matched
        ? `Your category (${profile.category}) is covered under eligible categories (${criteria.allowed_categories.join(', ')}).`
        : `Scheme is limited to ${criteria.allowed_categories.join(', ')}; your profile category is ${profile.category}.`,
    });
  }

  // 3. Annual Family Income check
  const incomeNoteLower = normalizeText(criteria.income_limit_note || '');
  const noIncomeLimit =
    incomeNoteLower.includes('no income limit') ||
    incomeNoteLower.includes('not applicable') ||
    incomeNoteLower.includes('merit based only');

  if (criteria.max_family_income_inr === null) {
    if (noIncomeLimit) {
      checks.push({
        condition: 'Annual Family Income',
        official_rule: criteria.income_limit_note || 'No income ceiling',
        student_value:
          profile.annual_family_income !== null
            ? `INR ${profile.annual_family_income.toLocaleString('en-IN')}`
            : 'Not required',
        status: 'PASS',
        reason: 'This merit/scheme rule specifies no annual family income ceiling.',
      });
    } else {
      checks.push({
        condition: 'Annual Family Income',
        official_rule: criteria.income_limit_note || 'Not verified',
        student_value:
          profile.annual_family_income !== null
            ? `INR ${profile.annual_family_income.toLocaleString('en-IN')}`
            : 'Missing',
        status: 'UNVERIFIED_RULE',
        reason: 'Official annual family income ceiling could not be verified from retrieved sources.',
      });
    }
  } else if (profile.annual_family_income === null || Number.isNaN(profile.annual_family_income)) {
    missingFields.add('annual_family_income');
    checks.push({
      condition: 'Annual Family Income',
      official_rule: `<= INR ${criteria.max_family_income_inr.toLocaleString('en-IN')}/year`,
      student_value: 'Not provided in student profile',
      status: 'MISSING_STUDENT_DATA',
      reason: 'Your annual family income is required to check the official income ceiling.',
    });
  } else {
    const pass = profile.annual_family_income <= criteria.max_family_income_inr;
    checks.push({
      condition: 'Annual Family Income',
      official_rule: `<= INR ${criteria.max_family_income_inr.toLocaleString('en-IN')}/year`,
      student_value: `INR ${profile.annual_family_income.toLocaleString('en-IN')}/year`,
      status: pass ? 'PASS' : 'FAIL',
      reason: pass
        ? `Family income (INR ${profile.annual_family_income.toLocaleString('en-IN')}) is within the limit of INR ${criteria.max_family_income_inr.toLocaleString('en-IN')}.`
        : `Family income (INR ${profile.annual_family_income.toLocaleString('en-IN')}) exceeds the scheme ceiling of INR ${criteria.max_family_income_inr.toLocaleString('en-IN')}.`,
    });
  }

  // 4. Education Level check
  const reqEduLower = normalizeText(criteria.min_education_level || '');
  if (!reqEduLower || reqEduLower === 'not verified') {
    checks.push({
      condition: 'Education Level',
      official_rule: 'Not verified',
      student_value: profile.education_level || 'Missing',
      status: 'UNVERIFIED_RULE',
      reason: 'Required education level was not verified in the official document.',
    });
  } else if (!profile.education_level.trim()) {
    missingFields.add('education_level');
    checks.push({
      condition: 'Education Level',
      official_rule: criteria.min_education_level,
      student_value: 'Not provided in student profile',
      status: 'MISSING_STUDENT_DATA',
      reason: 'Your current education level is missing from your profile.',
    });
  } else {
    const reqRank = normalizeEduRank(criteria.min_education_level);
    const stuRank = normalizeEduRank(profile.education_level);
    if (reqRank !== null && stuRank !== null) {
      // Distinguish exact pre-matric vs post-matric vs UG/PG schemes
      const isPreMatricOnly = reqEduLower.includes('pre-matric') && !reqEduLower.includes('post-matric');
      const isPostMatricScheme =
        reqEduLower.includes('post-matric') ||
        reqEduLower.includes('11') ||
        reqEduLower.includes('12') ||
        reqEduLower.includes('puc') ||
        reqEduLower.includes('ug') ||
        reqEduLower.includes('undergraduate');

      let matched = stuRank >= reqRank;
      if (isPreMatricOnly && stuRank > 1) matched = false;
      if (isPostMatricScheme && stuRank < 2) matched = false;
      if (reqEduLower.includes('postgraduate only') && stuRank < 5) matched = false;
      if (reqEduLower.includes('undergraduate only') && stuRank !== 4) matched = false;

      checks.push({
        condition: 'Education Level',
        official_rule: criteria.min_education_level,
        student_value: profile.education_level,
        status: matched ? 'PASS' : 'FAIL',
        reason: matched
          ? `Your education level (${profile.education_level}) satisfies "${criteria.min_education_level}".`
          : `Scheme requires "${criteria.min_education_level}", which does not match your current level (${profile.education_level}).`,
      });
    } else {
      checks.push({
        condition: 'Education Level',
        official_rule: criteria.min_education_level,
        student_value: profile.education_level,
        status: 'UNVERIFIED_RULE',
        reason: `Could not strictly map education level "${criteria.min_education_level}" against "${profile.education_level}".`,
      });
    }
  }

  // 5. Academic Percentage check (when verified threshold exists)
  if (criteria.min_percentage !== null && criteria.min_percentage > 0) {
    if (profile.previous_percentage === null || Number.isNaN(profile.previous_percentage)) {
      missingFields.add('previous_percentage');
      checks.push({
        condition: 'Minimum Marks / Percentage',
        official_rule: `>= ${criteria.min_percentage}%`,
        student_value: 'Not provided in student profile',
        status: 'MISSING_STUDENT_DATA',
        reason: `Scheme requires at least ${criteria.min_percentage}% marks in the previous qualifying exam.`,
      });
    } else {
      const pass = profile.previous_percentage >= criteria.min_percentage;
      checks.push({
        condition: 'Minimum Marks / Percentage',
        official_rule: `>= ${criteria.min_percentage}%`,
        student_value: `${profile.previous_percentage}%`,
        status: pass ? 'PASS' : 'FAIL',
        reason: pass
          ? `Your score (${profile.previous_percentage}%) meets the ${criteria.min_percentage}% minimum requirement.`
          : `Your score (${profile.previous_percentage}%) is below the required ${criteria.min_percentage}% threshold.`,
      });
    }
  }

  // 6. Course / Stream check
  const allowedCourses = criteria.allowed_courses.map(normalizeText);
  const allCoursesOpen =
    allowedCourses.length === 0 ||
    allowedCourses.some((c) => c === 'all' || c === 'all courses' || c === 'any recognized course');
  if (!allCoursesOpen && !allowedCourses.some((c) => c === 'not verified')) {
    if (!profile.course.trim()) {
      missingFields.add('course');
      checks.push({
        condition: 'Course / Stream',
        official_rule: criteria.allowed_courses.join(', '),
        student_value: 'Not provided in student profile',
        status: 'MISSING_STUDENT_DATA',
        reason: 'Your enrolled course/stream is needed to check course-specific eligibility.',
      });
    } else {
      const stuCourse = normalizeText(profile.course);
      const matched = allowedCourses.some((c) => {
        if (stuCourse.includes(c) || c.includes(stuCourse)) return true;
        if ((c.includes('technical') || c.includes('engineering')) && (stuCourse.includes('b.tech') || stuCourse.includes('b.e') || stuCourse.includes('engineering') || stuCourse.includes('diploma'))) return true;
        if (c.includes('professional') && (stuCourse.includes('b.tech') || stuCourse.includes('mbbs') || stuCourse.includes('mba') || stuCourse.includes('mca') || stuCourse.includes('law') || stuCourse.includes('pharmacy'))) return true;
        return false;
      });
      checks.push({
        condition: 'Course / Stream',
        official_rule: criteria.allowed_courses.join(', '),
        student_value: profile.course,
        status: matched ? 'PASS' : 'FAIL',
        reason: matched
          ? `Your course (${profile.course}) matches eligible streams (${criteria.allowed_courses.join(', ')}).`
          : `Scheme specifies ${criteria.allowed_courses.join(', ')}, while your profile lists ${profile.course}.`,
      });
    }
  }

  // 7. Gender check (if restricted)
  const genderReq = normalizeText(criteria.gender_requirement || 'all');
  if (genderReq && genderReq !== 'all' && genderReq !== 'any' && genderReq !== 'not verified') {
    if (!profile.gender.trim()) {
      missingFields.add('gender');
      checks.push({
        condition: 'Gender Requirement',
        official_rule: criteria.gender_requirement,
        student_value: 'Not provided',
        status: 'MISSING_STUDENT_DATA',
        reason: `This scheme has a specific gender criterion (${criteria.gender_requirement}).`,
      });
    } else {
      const stuGender = normalizeText(profile.gender);
      const pass =
        (genderReq.includes('female') || genderReq.includes('girl') || genderReq.includes('women'))
          ? stuGender === 'female'
          : stuGender === genderReq;
      checks.push({
        condition: 'Gender Requirement',
        official_rule: criteria.gender_requirement,
        student_value: profile.gender,
        status: pass ? 'PASS' : 'FAIL',
        reason: pass
          ? `Profile gender (${profile.gender}) matches requirement (${criteria.gender_requirement}).`
          : `Scheme is reserved for ${criteria.gender_requirement} applicants.`,
      });
    }
  }

  // 8. Disability check (if restricted)
  const disReq = normalizeText(criteria.disability_requirement || 'any');
  if (disReq && disReq !== 'any' && disReq !== 'none' && disReq !== 'all' && disReq !== 'not verified') {
    if (!profile.disability_status.trim()) {
      missingFields.add('disability_status');
      checks.push({
        condition: 'Disability / PwD Status',
        official_rule: criteria.disability_requirement,
        student_value: 'Not provided',
        status: 'MISSING_STUDENT_DATA',
        reason: 'Scheme requires PwD / disability status confirmation.',
      });
    } else {
      const stuDis = normalizeText(profile.disability_status);
      const pass = stuDis !== 'none' && stuDis !== 'no';
      checks.push({
        condition: 'Disability / PwD Status',
        official_rule: criteria.disability_requirement,
        student_value: profile.disability_status,
        status: pass ? 'PASS' : 'FAIL',
        reason: pass
          ? `PwD status (${profile.disability_status}) satisfies disability requirement.`
          : `Scheme is reserved for Persons with Disabilities (${criteria.disability_requirement}).`,
      });
    }
  }

  // 9. Minority check (if restricted)
  const minReq = normalizeText(criteria.minority_requirement || 'any');
  if (minReq && minReq !== 'any' && minReq !== 'all' && minReq !== 'none' && minReq !== 'not verified') {
    const stuMin = normalizeText(profile.minority_status || '');
    const stuCat = normalizeText(profile.category || '');
    if (!stuMin) {
      missingFields.add('minority_status');
      checks.push({
        condition: 'Minority Community Requirement',
        official_rule: criteria.minority_requirement,
        student_value: 'Not provided',
        status: 'MISSING_STUDENT_DATA',
        reason: 'Minority community status is required for this Ministry of Minority Affairs scheme.',
      });
    } else {
      const pass = (stuMin !== 'none' && stuMin !== 'no') || stuCat.includes('minority');
      checks.push({
        condition: 'Minority Community Requirement',
        official_rule: criteria.minority_requirement,
        student_value: profile.minority_status,
        status: pass ? 'PASS' : 'FAIL',
        reason: pass
          ? `Minority community status (${profile.minority_status}) matches scheme eligibility.`
          : `Scheme is specifically for notified minority communities (${criteria.minority_requirement}).`,
      });
    }
  }

  // 10. Outdated cycle warning check (informational)
  if (scholarship.outdated_flag) {
    checks.push({
      condition: 'Academic Cycle Currency',
      official_rule: `Active cycle check (${scholarship.academic_year || 'Current'})`,
      student_value: profile.academic_year || '2026-27',
      status: 'UNVERIFIED_RULE',
      reason:
        scholarship.outdated_reason ||
        'Retrieved official page shows a previous cycle deadline; verify active reopening on the portal.',
    });
  }

  // Compute strict deterministic outcome
  const hasFail = checks.some((c) => c.status === 'FAIL');
  const hasMissingOrUnverified = checks.some(
    (c) => c.status === 'MISSING_STUDENT_DATA' || c.status === 'UNVERIFIED_RULE'
  );

  let outcome: EligibilityOutcome;
  if (hasFail) {
    outcome = 'Not Eligible';
  } else if (hasMissingOrUnverified) {
    outcome = 'Needs More Information';
  } else {
    outcome = 'Likely Eligible';
  }

  return {
    outcome,
    rule_checks: checks,
    missing_fields: Array.from(missingFields),
  };
}
