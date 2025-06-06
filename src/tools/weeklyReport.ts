import { z } from 'zod';
import { tool } from '@openai/agents';
import dotenv from 'dotenv';

dotenv.config();

// Define the parameter types to match the zod schema
type WeeklyReportParams = {
  username: string;
  offset: number;
  generateSummary: boolean;
  organization: string;
};

// Interfaces for GitHub API responses
interface GitHubPR {
  title: string;
  number: number;
  createdAt: string;
  repo: string;
}

interface GitHubCommit {
  commit: {
    author: {
      date: string;
    };
    message: string;
  };
  repo: string;
}

interface GitHubGraphQLResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

interface GitHubGraphQLVariables {
  [key: string]: string | number | boolean | null;
}

interface GitHubRESTCommitResponse {
  items: Array<{
    commit: {
      author: {
        date: string;
      };
      message: string;
    };
    repository: {
      full_name: string;
    };
  }>;
}

interface GitHubGraphQLNode {
  title?: string;
  number?: number;
  createdAt?: string;
  repository?: {
    name: string;
    nameWithOwner?: string;
    full_name?: string;
  };
}

interface GitHubGraphQLPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface GitHubGraphQLSearchResponse {
  search: {
    nodes: GitHubGraphQLNode[];
    pageInfo: GitHubGraphQLPageInfo;
  };
}

interface GitHubGraphQLUserResponse {
  user: {
    repositories: {
      nodes: Array<{
        name: string;
        nameWithOwner: string;
      }>;
      pageInfo: GitHubGraphQLPageInfo;
    };
  };
}

interface GitHubGraphQLViewerResponse {
  viewer: {
    login: string;
  };
}

// Makes a minimal GraphQL request to GitHub for PR searching
async function makeGitHubGraphQLRequest<T>(
  token: string,
  query: string,
  variables: GitHubGraphQLVariables = {},
  retryCount = 0,
  maxRetries = 3,
): Promise<GitHubGraphQLResponse<T>> {
  const url = 'https://api.github.com/graphql';
  try {
    console.log(`Making GitHub GraphQL request: ${JSON.stringify(variables)}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github.v4+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    // Handle rate limiting
    if (
      (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') ||
      response.status === 429
    ) {
      if (retryCount < maxRetries) {
        let waitTime = 0;
        if (response.headers.get('X-RateLimit-Reset')) {
          waitTime = Number(response.headers.get('X-RateLimit-Reset')) * 1000 - Date.now() + 1000;
          waitTime = Math.min(waitTime, 10 * 60 * 1000); // cap at 10 minutes
        } else {
          waitTime = Math.min(1000 * Math.pow(2, retryCount) + Math.random() * 1000, 60000);
        }

        console.log(
          `Rate limit hit. Retrying in ${Math.floor(waitTime / 1000)} seconds (retry ${
            retryCount + 1
          }/${maxRetries})...`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return makeGitHubGraphQLRequest<T>(token, query, variables, retryCount + 1, maxRetries);
      }

      throw new Error(`GitHub API rate limit exceeded. Please try again later.`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `GitHub GraphQL API error (${response.status})`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.errors) {
          errorMessage += `: ${JSON.stringify(errorData.errors)}`;
        } else {
          errorMessage += `: ${JSON.stringify(errorData)}`;
        }
      } catch {
        errorMessage += `: ${errorText}`;
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (data.errors) {
      throw new Error(`GitHub GraphQL response errors: ${JSON.stringify(data.errors)}`);
    }

    return data as GitHubGraphQLResponse<T>;
  } catch (error) {
    console.error(`Error in makeGitHubGraphQLRequest:`, error);
    throw error;
  }
}

// Helper function to format a date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper function to format display dates
function formatDisplayDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[date.getDay()];
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return `${dayName} ${month}/${day}`;
}

// Get date range for the report
async function getDateRange(
  offsetWeeks: number = 0,
  startDateStr?: string,
  endDateStr?: string,
): Promise<{ startDate: string; endDate: string }> {
  if (startDateStr && endDateStr) {
    return {
      startDate: startDateStr,
      endDate: endDateStr,
    };
  }

  const now = new Date();
  if (offsetWeeks === 0) {
    const endDate = new Date(now);
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - 7);

    return {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    };
  } else {
    const day = now.getDay();
    const diff = day === 0 ? 7 : day;
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - diff - 7 * offsetWeeks);
    const nextSaturday = new Date(lastSunday);
    nextSaturday.setDate(lastSunday.getDate() + 6);

    return {
      startDate: formatDate(lastSunday),
      endDate: formatDate(nextSaturday),
    };
  }
}

// Simplified weekly report generation (without full GitHub API complexity)
async function generateSimplifiedWeeklyReport(
  username: string,
  startDate: string,
  endDate: string,
  organization: string,
  token: string,
): Promise<string> {
  try {
    // Simple GraphQL query to get user info
    const userQuery = `
      query($username: String!) {
        user(login: $username) {
          login
          name
          contributionsCollection(from: "${startDate}T00:00:00Z", to: "${endDate}T23:59:59Z") {
            totalCommitContributions
            totalPullRequestContributions
            totalRepositoryContributions
            contributionCalendar {
              totalContributions
            }
          }
        }
      }
    `;

    const response = await makeGitHubGraphQLRequest<{
      user: {
        login: string;
        name: string;
        contributionsCollection: {
          totalCommitContributions: number;
          totalPullRequestContributions: number;
          totalRepositoryContributions: number;
          contributionCalendar: {
            totalContributions: number;
          };
        };
      };
    }>(token, userQuery, { username });

    const user = response.data.user;
    const contributions = user.contributionsCollection;

    let reportContent = `# Weekly Report for ${user.name || user.login} (@${user.login})\n`;
    reportContent += `**Period:** ${startDate} to ${endDate}\n`;
    reportContent += `**Organization:** ${organization}\n\n`;

    reportContent += `## 📊 **Summary Statistics**\n\n`;
    reportContent += `- **Total Contributions:** ${contributions.contributionCalendar.totalContributions}\n`;
    reportContent += `- **Commits:** ${contributions.totalCommitContributions}\n`;
    reportContent += `- **Pull Requests:** ${contributions.totalPullRequestContributions}\n`;
    reportContent += `- **Repositories Contributed To:** ${contributions.totalRepositoryContributions}\n\n`;

    reportContent += `## 🎯 **Activity Overview**\n\n`;
    if (contributions.totalCommitContributions > 0) {
      reportContent += `✅ Made ${contributions.totalCommitContributions} commits this week\n`;
    }
    if (contributions.totalPullRequestContributions > 0) {
      reportContent += `🔄 Created ${contributions.totalPullRequestContributions} pull requests\n`;
    }
    if (contributions.totalRepositoryContributions > 0) {
      reportContent += `📂 Contributed to ${contributions.totalRepositoryContributions} repositories\n`;
    }

    if (contributions.contributionCalendar.totalContributions === 0) {
      reportContent += `ℹ️ No public contributions found for this period\n`;
    }

    reportContent += `\n---\n\n`;
    reportContent += `*Report generated using GitHub's contributions API*\n`;
    reportContent += `*Note: This includes public contributions only*`;

    return reportContent;
  } catch (error) {
    console.error('Error generating simplified report:', error);
    throw error;
  }
}

// Weekly Report generation function
export const createWeeklyReport = async (
  username: string,
  offset: number = 0,
  repos?: string[] | null,
  generateSummary: boolean = false,
  organization: string = 'Triple-Whale',
  startDate?: string | null,
  endDate?: string | null,
): Promise<{ report: string } | { error: string }> => {
  if (!username) {
    return { error: 'Username is required' };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
  if (!GITHUB_TOKEN) {
    return {
      error: 'GitHub token is required. Please set GITHUB_TOKEN in your environment variables.',
    };
  }

  try {
    // Validate GitHub token
    const testQuery = `query { viewer { login } }`;
    await makeGitHubGraphQLRequest<GitHubGraphQLViewerResponse>(GITHUB_TOKEN, testQuery);
  } catch (error) {
    console.error('Error validating GitHub token:', error);
    if (error instanceof Error) {
      return { error: `GitHub token validation failed - ${error.message}` };
    }
    return { error: 'GitHub token validation failed' };
  }

  try {
    const { startDate: calculatedStartDate, endDate: calculatedEndDate } = await getDateRange(
      offset,
      startDate || undefined,
      endDate || undefined,
    );

    const report = await generateSimplifiedWeeklyReport(
      username,
      calculatedStartDate,
      calculatedEndDate,
      organization,
      GITHUB_TOKEN,
    );

    return { report };
  } catch (error) {
    console.error('Error in createWeeklyReport:', error);
    if (error instanceof Error) {
      return { error: `Error generating weekly report: ${error.message}` };
    }
    return { error: 'Error generating weekly report: Unknown error' };
  }
};

// Weekly Report Tool
export const weeklyReportTool = tool({
  name: 'weekly_report',
  description:
    'Generate comprehensive GitHub activity reports including contribution statistics for a specific user over a weekly period. Useful for team reports, performance reviews, and activity tracking.',
  parameters: z.object({
    username: z.string().describe('GitHub username to generate report for'),
    offset: z
      .number()
      .default(0)
      .describe('Offset the week range by this many weeks (default: 0 for last 7 days)'),
    generateSummary: z
      .boolean()
      .default(false)
      .describe('Whether to generate an AI summary using OpenAI (for future enhancement)'),
    organization: z
      .string()
      .default('Triple-Whale')
      .describe('GitHub organization name (default: Triple-Whale)'),
  }),
  needsApproval: async (_ctx, { username }) => {
    // Always require approval for GitHub API access due to sensitive nature
    return true;
  },
  execute: async ({
    username,
    offset = 0,
    generateSummary = false,
    organization = 'Triple-Whale',
  }) => {
    try {
      if (!username || username.trim() === '') {
        throw new Error('Username cannot be empty');
      }

      // Set repos, startDate, endDate to undefined since they're not exposed as parameters
      const result = await createWeeklyReport(
        username,
        offset,
        undefined,
        generateSummary,
        organization,
        undefined,
        undefined,
      );

      // Check if there was an error
      if ('error' in result) {
        throw new Error(result.error);
      }

      let response = `📊 **GitHub Weekly Report Generated**\n\n`;
      response += `👤 **User:** ${username}\n`;
      response += `🏢 **Organization:** ${organization}\n`;
      if (offset !== 0) {
        response += `📅 **Week Offset:** ${offset} weeks ago\n`;
      }
      response += `\n---\n\n${result.report}`;

      return response;
    } catch (error) {
      return `Error generating weekly report: ${
        error instanceof Error ? error.message : 'Unknown error occurred'
      }`;
    }
  },
});
