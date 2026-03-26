# Browser Automation MCP: User Cases & Test Scenarios

This document provides 20 detailed test cases and usage scenarios for the Browser Automation MCP server. You can use these prompts directly with Claude Desktop to test different features.

## 📁 Category 1: Basic Browser Control

1. **Verify Navigation**
   - Prompt: "Navigate to https://www.wikipedia.org and confirm the page has loaded successfully."

2. **Single Screenshot**
   - Prompt: "Go to https://duckduckgo.com and take a screenshot named 'DuckDuckGo-Home'."

3. **Multiple Clicks**
   - Prompt: "Navigate to https://example.com, find the 'More Information' link, and click it."

4. **Input Field Entry**
   - Prompt: "Go to https://www.google.com and type 'Model Context Protocol' into the search bar."

## 📁 Category 2: Data Scraping

5. **List Scraping**
   - Prompt: "Go to https://news.ycombinator.com and scrape the first page of news titles using the '.titleline' selector."

6. **Price Monitoring**
   - Prompt: "Navigate to an e-commerce product page and scrape the product price using its CSS selector."

7. **Table Data Extraction**
   - Prompt: "Find a website with a data table and scrape all the rows from the first column."

8. **Scraping Multiple Attributes**
   - Prompt: "Go to a blog site and scrape all article titles and their corresponding URLs."

## 📁 Category 3: Excel & Sheet Operations

9. **Read Excel Row by Row**
   - Prompt: "Read the data from 'C:/path/to/my/users.xlsx' and tell me how many users are in the file."

10. **Data Entry from Sheet**
    - Prompt: "Read 'C:/data/login_info.xlsx'. For every row, go to 'https://mysite.com/login' and fill the username and password fields."

11. **Filtering Sheet Data**
    - Prompt: "Read your spreadsheet at 'C:/data/contacts.xlsx', find everyone with an '@gmail.com' address, and list them for me."

12. **Scrape to New Excel File**
    - Prompt: "Scrape the news headlines from 'https://bbc.com/news' and save them as an Excel file named 'MorningNews.xlsx'."

13. **Combining Sheet Data with UI**
    - Prompt: "Read 'C:/data/orders.xlsx', go to the order tracking site, and search for each tracking number found in the sheet."

## 📁 Category 4: Exports & Reports

14. **PDF Export of a Page**
    - Prompt: "Navigate to your company's 'About Us' page and export it to a PDF file named 'CompanyProfile.pdf'."

15. **Scraped Data Summary Export**
    - Prompt: "Scrape the current stock prices from a financial site and save the summarized list to an Excel file named 'MarketSummary.xlsx'."

16. **Full Session Export**
    - Prompt: "Navigate through three different search results, take a screenshot of each, and then save all the titles you found into 'SearchResults.xlsx'."

## 📁 Category 5: Video Logging & Flow Capture

17. **Full Flow Recording**
    - Prompt: "Perform a complete search on Amazon for 'Mechanical Keyboards', click the first result, and then stop the automation and save the video as 'AmazonSearchFlow'."

18. **Testing a Form Submission**
    - Prompt: "Fill out the contact form on 'https://contactsite.com', submit it, and then save the resulting video as 'ContactFormTest'."

19. **Naming Automation Sessions**
    - Prompt: "Start a browser session, go to GitHub, search for 'MCP', and then use 'stop_automation' with the name 'GitHubResearchSession'."

## 📁 Category 6: Advanced & Multi-Session

20. **Resetting Sessions**
    - Prompt: "Go to 'https://site-a.com', take a screenshot, then use 'stop_automation' to reset the session before navigating to 'https://site-b.com'."

---
Author: Ruturaj Sharbidre
