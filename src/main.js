/**
 * Шаг 3. Функция для расчета выручки
 */
function calculateSimpleRevenue(purchase, _product) {
    const { sale_price, quantity, discount } = purchase;
    const discountFactor = 1 - (discount / 100);
    return sale_price * quantity * discountFactor;
}

/**
 * Шаг 1. Функция для расчета бонусов
 */
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller;

    if (index === 0) {
        return profit * 0.15; // 15% лидеру
    } else if (index === 1 || index === 2) {
        return profit * 0.10; // 10% второму и третьему местам
    } else if (index === total - 1 && total > 1) {
        return 0;             // 0% последнему
    } else {
        return profit * 0.05; // 5% остальным
    }
}

/**
 * Шаг 4-8. Главная функция анализа данных продаж
 */
function analyzeSalesData(data, options) {
    // --- Шаг 6. Валидация входных данных ---
    if (!data 
        || !Array.isArray(data.sellers) 
        || !Array.isArray(data.products) 
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // --- Шаг 6. Проверка опций ---
    const { calculateRevenue, calculateBonus } = options;
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Функции расчёта обязательны в объекте options');
    }

    // --- Шаг 5. Подготовка индексов (для быстрого доступа) ---
    const productIndex = Object.fromEntries(data.products.map(p => [p.sku, p]));
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));
    const sellerIndex = Object.fromEntries(sellerStats.map(s => [s.id, s]));

    // --- Шаг 7. Обработка чеков и товаров (Двойной цикл) ---
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        if (!seller) return;

        seller.sales_count += 1;
        seller.revenue += record.total_amount;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            if (!product) return;

            const revenue = calculateRevenue(item, product);
            const cost = product.purchase_price * item.quantity;
            seller.profit += (revenue - cost);

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // --- Шаг 7. Упорядочивание продавцов по прибыли ---
    sellerStats.sort((a, b) => b.profit - a.profit);

    // --- Шаг 8. Назначение премий и формирование топ-10 ---
    sellerStats.forEach((seller, index) => {
        // Рассчитываем бонус
        seller.bonus = calculateBonus(index, sellerStats.length, seller);

        // Формируем массив топ-10 товаров
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // --- Шаг 8. Формирование и возврат итогового отчёта ---
    
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}