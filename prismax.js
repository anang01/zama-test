const axios = require('axios');
const dotenv = require('dotenv');
const prompt = require('prompt-sync')({ sigint: true });

dotenv.config();

const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m"
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  countdown: (msg) => process.stdout.write(`\r${colors.blue}[⏰] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`---------------------------------------------`);
    console.log(`  PrismaX Auto Bot - Airdrop Insiders  `);
    console.log(`---------------------------------------------${colors.reset}`);
    console.log();
  }
};

function getRandomUserAgent() {
  const userAgents = [
    '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"',
    '"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"',
    '"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0"',
    '"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15"',
    '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.864.59 Safari/537.36"',
    '"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

class PrismaxDailyLoginBot {
  constructor(email) {
    this.email = email;
    this.baseUrl = 'https://app-prismax-backend-1053158761087.us-west2.run.app/api/daily-login-points';
    this.headers = {
      "accept": "*/*",
      "accept-language": "en-US,en;q=0.7",
      "content-type": "application/json",
      "priority": "u=1, i",
      "sec-ch-ua": getRandomUserAgent(),
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "sec-gpc": "1",
      "Referer": "https://app.prismax.ai/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    };
  }

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async dailyLogin(date) {
    try {
      const dateString = this.formatDate(date);
      const payload = {
        email: this.email,
        user_local_date: dateString
      };

      logger.loading(`Performing daily login for date: ${dateString}`);
      
      const response = await axios.post(this.baseUrl, payload, {
        headers: this.headers
      });

      if (response.data.success) {
        const data = response.data.data;
        logger.success(`Login successful - ${dateString}`);
        logger.step(`   Today's points: ${data.points_awarded_today}`);
        logger.step(`   Total points: ${data.total_points}`);
        logger.step(`   Status: ${data.already_claimed_daily ? 'Already claimed' : 'Newly claimed'}`);
        logger.step(`   User class: ${data.user_class}`);
        return {
          success: true,
          date: dateString,
          data: data
        };
      } else {
        logger.error(`Login failed - ${dateString}`);
        return {
          success: false,
          date: dateString,
          error: 'Response not successful'
        };
      }
    } catch (error) {
      logger.error(`Error on ${this.formatDate(date)}: ${error.message}`);
      return {
        success: false,
        date: this.formatDate(date),
        error: error.message
      };
    }
  }

  getAllDatesInRange(startYear, endYear) {
    const dates = [];
    for (let year = startYear; year <= endYear; year++) {
      for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          dates.push(new Date(year, month, day));
        }
      }
    }
    return dates;
  }

  async runLoginForYearRange(startYear, endYear, delayMs = 2000) {
    logger.info(`Starting daily login bot for all dates from ${startYear} to ${endYear}`);
    logger.info(`Email: ${this.email}`);
    logger.info(`Delay between requests: ${delayMs}ms`);

    const dates = this.getAllDatesInRange(startYear, endYear);
    const results = [];

    for (const date of dates) {
      const result = await this.dailyLogin(date);
      results.push(result);

      if (date !== dates[dates.length - 1]) {
        await this.sleep(delayMs);
      }
    }

    logger.info('SUMMARY OF RESULTS:');
    console.log('='.repeat(50));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    logger.success(`Successful: ${successful.length} days`);
    logger.error(`Failed: ${failed.length} days`);
    
    if (failed.length > 0) {
      logger.warn('Failed dates:');
      failed.forEach(f => {
        logger.step(`   - ${f.date}: ${f.error}`);
      });
    }

    const totalPointsEarned = successful.reduce((sum, result) => {
      return sum + (result.data?.points_awarded_today || 0);
    }, 0);

    logger.info(`Total points earned: ${totalPointsEarned}`);
    
    return results;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

function loadEmails() {
  const emails = [];
  let i = 1;
  while (process.env[`EMAIL_${i}`]) {
    emails.push(process.env[`EMAIL_${i}`]);
    i++;
  }
  return emails;
}

async function main() {
  
  logger.banner();

  const emails = loadEmails();
  if (emails.length === 0) {
    logger.error('No emails found in .env file. Please add EMAIL_1, EMAIL_2, etc.');
    return;
  }

  const startYear = parseInt(prompt('Enter start year (e.g., 2023): '));
  const endYear = parseInt(prompt('Enter end year (e.g., 2025): '));

  if (isNaN(startYear) || isNaN(endYear) || startYear > endYear) {
    logger.error('Invalid year range. Start year must be less than or equal to end year.');
    return;
  }

  for (const email of emails) {
    const bot = new PrismaxDailyLoginBot(email);
    try {
      await bot.runLoginForYearRange(startYear, endYear, 2000);
    } catch (error) {
      logger.error(`Error running bot for ${email}: ${error.message}`);
    }
  }

  logger.success('All emails processed successfully!');
}

if (require.main === module) {
  main();
}

module.exports = PrismaxDailyLoginBot;