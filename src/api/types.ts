export interface ContributionSearchItem {
  MemberName: string;
  MemberId: number;
  AttributedTo: string;
  ItemId: number;
  ContributionExtId: string;
  ContributionText: string;
  ContributionTextFull: string;
  HRSTag: string;
  DebateSection: string;
  DebateSectionId: number;
  DebateSectionExtId: string;
  SittingDate: string;
  Section: string;
  House: string;
  OrderInDebateSection: number;
  Rank: number;
}

export interface SearchContributionsResult {
  SearchTerms: string[];
  TotalResultCount: number;
  SpokenResultCount: number;
  Results: ContributionSearchItem[];
}

export interface DebateSearchItem {
  Title: string;
  DebateSection: string;
  House: string;
  SittingDate: string;
  DebateSectionExtId: string;
  Rank: number;
}

export interface SearchDebatesResult {
  TotalResultCount: number;
  Results: DebateSearchItem[];
}

export interface DebateOverview {
  Id: number;
  ExtId: string;
  Title: string;
  HRSTag: string;
  Date: string;
  Location: string;
  House: string;
  NextDebateExtId: string | null;
  NextDebateTitle: string | null;
  PreviousDebateExtId: string | null;
  PreviousDebateTitle: string | null;
}

export interface DebateItem {
  ItemType: 'Contribution' | 'Timestamp';
  ItemId: number;
  MemberId: number | null;
  AttributedTo: string | null;
  Value: string;
  OrderInSection: number;
  ExternalId: string | null;
  HRSTag: string | null;
  IsReiteration: boolean;
}

export interface Debate {
  Overview: DebateOverview;
  Navigator: unknown[];
  Items: DebateItem[];
  ChildDebates: Debate[];
}

export interface SectionTreeItem {
  Id: number;
  Title: string;
  ParentId: number | null;
  SortOrder: number;
  ExternalId: string;
  HRSTag: string | null;
  HansardSection: string | null;
  Timecode: string | null;
}

export interface SectionTreeSection {
  House: string;
  Title: string;
  Description: string;
  SectionTreeItems: SectionTreeItem[];
}
