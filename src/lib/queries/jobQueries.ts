/**
 * Job Query Helpers
 *
 * Platform-specific queries for filtering jobs by audience tags.
 * Used by GenZ Jobs, JobScroll, and RJRP platforms.
 */

import { prisma } from '@/lib/prisma';
import { Prisma, ExperienceLevel } from '@prisma/client';

// ==================== Types ====================

export interface JobFilters {
  search?: string;
  location?: string;
  jobType?: string;
  experienceLevel?: ExperienceLevel;
  remote?: boolean;
  category?: string;
  company?: string;
  country?: string;
  minSalary?: number;
  maxSalary?: number;
  skills?: string[];
  isActive?: boolean;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface SortOptions {
  sortBy?: 'postedAt' | 'salaryMax' | 'salaryMin' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

// ==================== Filter Builder ====================

/**
 * Build Prisma where clause from filters
 */
function buildWhereClause(filters?: JobFilters): Prisma.JobListingWhereInput {
  if (!filters) return { isActive: true };

  const where: Prisma.JobListingWhereInput = {
    isActive: filters.isActive ?? true,
  };

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { company: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.location) {
    where.location = { contains: filters.location, mode: 'insensitive' };
  }

  if (filters.jobType) {
    where.jobType = filters.jobType;
  }

  if (filters.experienceLevel) {
    where.experienceLevel = filters.experienceLevel;
  }

  if (filters.remote !== undefined) {
    where.remote = filters.remote;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.company) {
    where.company = { contains: filters.company, mode: 'insensitive' };
  }

  if (filters.country) {
    where.country = filters.country;
  }

  if (filters.minSalary) {
    where.salaryMin = { gte: filters.minSalary };
  }

  if (filters.maxSalary) {
    where.salaryMax = { lte: filters.maxSalary };
  }

  if (filters.skills && filters.skills.length > 0) {
    where.skills = { hasSome: filters.skills };
  }

  return where;
}

/**
 * Build pagination options
 */
function buildPagination(options?: PaginationOptions) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * Build sort options
 */
function buildOrderBy(options?: SortOptions): Prisma.JobListingOrderByWithRelationInput {
  const sortBy = options?.sortBy ?? 'postedAt';
  const sortOrder = options?.sortOrder ?? 'desc';
  return { [sortBy]: sortOrder };
}

// ==================== GenZ Jobs Queries ====================

/**
 * Get jobs for GenZ Jobs platform (entry-level positions)
 */
export async function getGenZJobs(
  filters?: JobFilters,
  pagination?: PaginationOptions,
  sort?: SortOptions
) {
  const where: Prisma.JobListingWhereInput = {
    ...buildWhereClause(filters),
    audienceTags: { has: 'genz' },
  };

  const [jobs, total] = await Promise.all([
    prisma.jobListing.findMany({
      where,
      orderBy: buildOrderBy(sort),
      ...buildPagination(pagination),
    }),
    prisma.jobListing.count({ where }),
  ]);

  return {
    jobs,
    total,
    page: pagination?.page ?? 1,
    pageSize: pagination?.pageSize ?? 20,
    totalPages: Math.ceil(total / (pagination?.pageSize ?? 20)),
  };
}

/**
 * Count GenZ jobs (for stats)
 */
export async function countGenZJobs(filters?: JobFilters) {
  return prisma.jobListing.count({
    where: {
      ...buildWhereClause(filters),
      audienceTags: { has: 'genz' },
    },
  });
}

// ==================== JobScroll Queries ====================

/**
 * Get jobs for JobScroll platform (mid-to-senior positions)
 */
export async function getJobScrollJobs(
  filters?: JobFilters,
  pagination?: PaginationOptions,
  sort?: SortOptions
) {
  const where: Prisma.JobListingWhereInput = {
    ...buildWhereClause(filters),
    audienceTags: { hasSome: ['mid_career', 'senior', 'executive'] },
  };

  const [jobs, total] = await Promise.all([
    prisma.jobListing.findMany({
      where,
      orderBy: buildOrderBy(sort),
      ...buildPagination(pagination),
    }),
    prisma.jobListing.count({ where }),
  ]);

  return {
    jobs,
    total,
    page: pagination?.page ?? 1,
    pageSize: pagination?.pageSize ?? 20,
    totalPages: Math.ceil(total / (pagination?.pageSize ?? 20)),
  };
}

/**
 * Count JobScroll jobs (for stats)
 */
export async function countJobScrollJobs(filters?: JobFilters) {
  return prisma.jobListing.count({
    where: {
      ...buildWhereClause(filters),
      audienceTags: { hasSome: ['mid_career', 'senior', 'executive'] },
    },
  });
}

// ==================== RJRP Queries ====================

/**
 * Get verified jobs for RJRP platform
 */
export async function getRjrpVerifiedJobs(
  filters?: JobFilters,
  pagination?: PaginationOptions,
  sort?: SortOptions
) {
  const where: Prisma.JobListingWhereInput = {
    ...buildWhereClause(filters),
    isRjrpVerified: true,
  };

  const [jobs, total] = await Promise.all([
    prisma.jobListing.findMany({
      where,
      orderBy: buildOrderBy(sort),
      ...buildPagination(pagination),
    }),
    prisma.jobListing.count({ where }),
  ]);

  return {
    jobs,
    total,
    page: pagination?.page ?? 1,
    pageSize: pagination?.pageSize ?? 20,
    totalPages: Math.ceil(total / (pagination?.pageSize ?? 20)),
  };
}

/**
 * Count RJRP verified jobs (for stats)
 */
export async function countRjrpVerifiedJobs(filters?: JobFilters) {
  return prisma.jobListing.count({
    where: {
      ...buildWhereClause(filters),
      isRjrpVerified: true,
    },
  });
}

// ==================== Experience Level Queries ====================

/**
 * Get jobs by specific experience level
 */
export async function getJobsByExperienceLevel(
  level: ExperienceLevel,
  filters?: JobFilters,
  pagination?: PaginationOptions,
  sort?: SortOptions
) {
  const where: Prisma.JobListingWhereInput = {
    ...buildWhereClause(filters),
    experienceLevel: level,
  };

  const [jobs, total] = await Promise.all([
    prisma.jobListing.findMany({
      where,
      orderBy: buildOrderBy(sort),
      ...buildPagination(pagination),
    }),
    prisma.jobListing.count({ where }),
  ]);

  return {
    jobs,
    total,
    page: pagination?.page ?? 1,
    pageSize: pagination?.pageSize ?? 20,
    totalPages: Math.ceil(total / (pagination?.pageSize ?? 20)),
  };
}

// ==================== Stats Queries ====================

/**
 * Get job counts by experience level
 */
export async function getJobCountsByLevel(filters?: JobFilters) {
  const baseWhere = buildWhereClause(filters);

  const [entry, mid, senior, executive, total] = await Promise.all([
    prisma.jobListing.count({ where: { ...baseWhere, experienceLevel: 'ENTRY' } }),
    prisma.jobListing.count({ where: { ...baseWhere, experienceLevel: 'MID' } }),
    prisma.jobListing.count({ where: { ...baseWhere, experienceLevel: 'SENIOR' } }),
    prisma.jobListing.count({ where: { ...baseWhere, experienceLevel: 'EXECUTIVE' } }),
    prisma.jobListing.count({ where: baseWhere }),
  ]);

  return {
    entry,
    mid,
    senior,
    executive,
    total,
    percentages: {
      entry: total > 0 ? ((entry / total) * 100).toFixed(1) : '0',
      mid: total > 0 ? ((mid / total) * 100).toFixed(1) : '0',
      senior: total > 0 ? ((senior / total) * 100).toFixed(1) : '0',
      executive: total > 0 ? ((executive / total) * 100).toFixed(1) : '0',
    },
  };
}

/**
 * Get job counts by audience tag
 */
export async function getJobCountsByAudience(filters?: JobFilters) {
  const baseWhere = buildWhereClause(filters);

  const [genz, midCareer, senior, executive, verified] = await Promise.all([
    prisma.jobListing.count({ where: { ...baseWhere, audienceTags: { has: 'genz' } } }),
    prisma.jobListing.count({ where: { ...baseWhere, audienceTags: { has: 'mid_career' } } }),
    prisma.jobListing.count({ where: { ...baseWhere, audienceTags: { has: 'senior' } } }),
    prisma.jobListing.count({ where: { ...baseWhere, audienceTags: { has: 'executive' } } }),
    prisma.jobListing.count({ where: { ...baseWhere, isRjrpVerified: true } }),
  ]);

  return {
    genz,
    midCareer,
    senior,
    executive,
    verified,
  };
}

/**
 * Get low confidence jobs for review
 */
export async function getLowConfidenceJobs(
  threshold: number = 0.5,
  pagination?: PaginationOptions
) {
  const where: Prisma.JobListingWhereInput = {
    isActive: true,
    classificationConfidence: { lt: threshold },
  };

  const [jobs, total] = await Promise.all([
    prisma.jobListing.findMany({
      where,
      orderBy: { classificationConfidence: 'asc' },
      select: {
        id: true,
        title: true,
        company: true,
        experienceLevel: true,
        audienceTags: true,
        classificationConfidence: true,
        salaryMin: true,
        salaryMax: true,
      },
      ...buildPagination(pagination),
    }),
    prisma.jobListing.count({ where }),
  ]);

  return { jobs, total };
}
