import { test, expect } from '@playwright/test';

test.describe('Guest Checkout Flow', () => {
    test('should complete guest checkout for 3 in 1 laptop backpack', async ({ page }) => {
        // 1. Navigate to the homepage
        await page.goto('/');

        // 2. Perform a search for the backpack
        // Locate the search input in the header. We'll find the first visible text input.
        const searchInput = page.locator('input[type="text"]').first();
        await searchInput.waitFor({ state: 'visible' });
        await searchInput.fill('3 in 1 laptop backpack');
        await searchInput.press('Enter');

        // 3. Wait for search results and click the product
        await page.waitForURL(/.*\/search\?q=.*/);

        // The product card should contain the title. We look for part of it text
        const productLink = page.locator('text="3 in 1 Laptop Backpack"').first();
        await productLink.waitFor({ state: 'visible' });
        await productLink.click();

        // 4. On the Product Page, click the "Buy Now" button
        await page.waitForURL(/.*\/product\/.*/);
        const buyNowButton = page.locator('button', { hasText: 'Buy Now' }).first();
        await buyNowButton.waitFor({ state: 'visible' });
        await buyNowButton.click();

        // 5. Checkout Step 1: Shipping Address (Guest)
        await page.waitForURL(/.*\/checkout.*/);

        // Fill in guest details
        await page.getByPlaceholder('Enter first name').fill('Chidi');
        await page.getByPlaceholder('Enter last name').fill('Okafor');
        await page.getByPlaceholder('your@email.com').fill('chidi.test@example.com');
        await page.getByPlaceholder('+234 xxx xxx xxxx').fill('08012345678');

        // We assume default delivery method is 'Door Delivery'. 
        await page.getByPlaceholder('123 Example Street').first().fill('12 Test Street, Yaba');
        await page.getByPlaceholder('Lagos').first().fill('Lagos');

        // Confirm Details to proceed to Step 2
        await page.locator('button', { hasText: 'Confirm Details' }).click();

        // 6. Checkout Step 2: Payment Method
        // Proceed to summary
        const proceedToSummaryBtn = page.locator('button', { hasText: 'PROCEED TO SUMMARY' });
        await proceedToSummaryBtn.waitFor({ state: 'visible' });
        await proceedToSummaryBtn.click();

        // 7. Checkout Step 3: Review Items & Place Order
        // The "PLACE ORDER" button is usually in the Order Summary sticky bar on the right
        const placeOrderBtn = page.locator('button', { hasText: 'PLACE ORDER' }).first();
        await placeOrderBtn.waitFor({ state: 'visible' });
        await placeOrderBtn.click();

        // 8. Verify the order completes and redirects
        // Since this is a guest checkout, it should redirect to the /register page to claim the order
        await page.waitForURL(/.*\/register\?email=.*/, { timeout: 10000 });

        // Ensure the redirect included the email indicating success
        expect(page.url()).toContain('chidi.test@example.com');
        await expect(page.locator('text="Create an Account"').first()).toBeVisible();
    });
});
