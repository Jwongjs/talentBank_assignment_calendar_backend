export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export type Gender = 'Male' | 'Female' | 'PreferNotToSay';
export const GENDER_OPTIONS: SelectOption<Gender>[] = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'PreferNotToSay', label: 'Prefer not to say' },
];

export type ProfileType = 'Student' | 'FreshGraduate' | 'ExperiencedProfessional' | 'CareerSwitcher';
export const PROFILE_TYPE_OPTIONS: SelectOption<ProfileType>[] = [
  { value: 'Student', label: 'Student' },
  { value: 'FreshGraduate', label: 'Fresh Graduate' },
  { value: 'ExperiencedProfessional', label: 'Experienced Professional' },
  { value: 'CareerSwitcher', label: 'Career Switcher' },
];

export type AgeRange = 'Under18' | 'Age18to24' | 'Age25to34' | 'Age35to44' | 'Age45to54' | 'Age55Plus';
export const AGE_RANGE_OPTIONS: SelectOption<AgeRange>[] = [
  { value: 'Under18', label: 'Under 18' },
  { value: 'Age18to24', label: '18-24' },
  { value: 'Age25to34', label: '25-34' },
  { value: 'Age35to44', label: '35-44' },
  { value: 'Age45to54', label: '45-54' },
  { value: 'Age55Plus', label: '55+' },
];

export type JobExperience =
  | 'Studying'
  | 'TraineeIntern'
  | 'Junior'
  | 'Senior'
  | 'Manager'
  | 'Director'
  | 'VP'
  | 'CSuite'
  | 'Partner'
  | 'Founder';
export const JOB_EXPERIENCE_OPTIONS: SelectOption<JobExperience>[] = [
  { value: 'Studying', label: 'Studying' },
  { value: 'TraineeIntern', label: 'Trainee/Intern' },
  { value: 'Junior', label: 'Junior' },
  { value: 'Senior', label: 'Senior' },
  { value: 'Manager', label: 'Manager' },
  { value: 'Director', label: 'Director' },
  { value: 'VP', label: 'VP' },
  { value: 'CSuite', label: 'C-suite' },
  { value: 'Partner', label: 'Partner' },
  { value: 'Founder', label: 'Founder' },
];

export type CandidateBackground =
  | 'InformationTechnology'
  | 'BusinessFinance'
  | 'Engineering'
  | 'MarketingCommunications'
  | 'DesignCreative'
  | 'HumanResources'
  | 'ScienceResearch'
  | 'Other';
export const BACKGROUND_OPTIONS: SelectOption<CandidateBackground>[] = [
  { value: 'InformationTechnology', label: 'Information Technology' },
  { value: 'BusinessFinance', label: 'Business & Finance' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'MarketingCommunications', label: 'Marketing & Communications' },
  { value: 'DesignCreative', label: 'Design & Creative' },
  { value: 'HumanResources', label: 'Human Resources' },
  { value: 'ScienceResearch', label: 'Science & Research' },
  { value: 'Other', label: 'Other' },
];

export type ReferralSource =
  | 'SocialMedia'
  | 'UniversityCareerCenter'
  | 'FriendReferral'
  | 'JobPortal'
  | 'TalentbankWebsite'
  | 'Other';
export const REFERRAL_SOURCE_OPTIONS: SelectOption<ReferralSource>[] = [
  { value: 'SocialMedia', label: 'Social Media' },
  { value: 'UniversityCareerCenter', label: 'University / Career Center' },
  { value: 'FriendReferral', label: 'Friend Referral' },
  { value: 'JobPortal', label: 'Job Portal' },
  { value: 'TalentbankWebsite', label: 'Talentbank Website' },
  { value: 'Other', label: 'Other' },
];

export type ArrivalTime = 'Morning' | 'Midday' | 'Afternoon' | 'LateAfternoon';
export const ARRIVAL_TIME_OPTIONS: SelectOption<ArrivalTime>[] = [
  { value: 'Morning', label: 'Morning (before 11am)' },
  { value: 'Midday', label: 'Midday (11am-1pm)' },
  { value: 'Afternoon', label: 'Afternoon (1pm-3pm)' },
  { value: 'LateAfternoon', label: 'Late afternoon (after 3pm)' },
];

export type BookingMethod = 'CompleteOnlineForm' | 'ScheduleCall' | 'WhatsAppMessage';
export const BOOKING_METHOD_OPTIONS: SelectOption<BookingMethod>[] = [
  { value: 'CompleteOnlineForm', label: 'Complete an online form' },
  { value: 'ScheduleCall', label: 'Schedule a call' },
  { value: 'WhatsAppMessage', label: 'Message us on WhatsApp' },
];
