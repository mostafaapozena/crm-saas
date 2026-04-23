const prisma = require('../lib/prisma')

// Helper: build date range filter for createdAt
function dateRangeWhere(from_date, to_date) {
  const filter = {}
  if (from_date || to_date) {
    filter.createdAt = {}
    if (from_date) filter.createdAt.gte = new Date(from_date)
    if (to_date) filter.createdAt.lte = new Date(to_date)
  }
  return filter
}

// Helper: safe Number conversion for Decimal fields
function toNum(val) {
  return parseFloat(val) || 0
}

exports.salesReport = async (req, res) => {
  try {
    const { from_date, to_date } = req.query
    const where = dateRangeWhere(from_date, to_date)

    const sales = await prisma.posSale.findMany({
      where,
      include: {
        items: {
          include: { product: true }
        }
      }
    })

    // Summary
    let total_revenue = 0
    let total_discount = 0
    let total_tax = 0

    for (const s of sales) {
      total_revenue += toNum(s.total)
      total_discount += toNum(s.discount)
      total_tax += toNum(s.tax)
    }

    const total_sales = sales.length
    const avg_sale_value = total_sales > 0 ? parseFloat((total_revenue / total_sales).toFixed(2)) : 0

    // By payment method
    const pmMap = {}
    for (const s of sales) {
      const m = s.payment_method
      if (!pmMap[m]) pmMap[m] = { method: m, count: 0, total: 0 }
      pmMap[m].count++
      pmMap[m].total = parseFloat((pmMap[m].total + toNum(s.total)).toFixed(2))
    }
    const by_payment_method = Object.values(pmMap)

    // By status
    const stMap = {}
    for (const s of sales) {
      const st = s.status
      if (!stMap[st]) stMap[st] = { status: st, count: 0, total: 0 }
      stMap[st].count++
      stMap[st].total = parseFloat((stMap[st].total + toNum(s.total)).toFixed(2))
    }
    const by_status = Object.values(stMap)

    // Top products
    const prodMap = {}
    for (const s of sales) {
      for (const item of s.items) {
        const pid = item.product_id
        const name = item.product ? item.product.name : 'Unknown'
        if (!prodMap[pid]) prodMap[pid] = { product_id: pid, name, total_qty: 0, total_revenue: 0 }
        prodMap[pid].total_qty += item.quantity
        const lineRevenue = toNum(item.price) * item.quantity - toNum(item.discount)
        prodMap[pid].total_revenue = parseFloat((prodMap[pid].total_revenue + lineRevenue).toFixed(2))
      }
    }
    const top_products = Object.values(prodMap)
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 10)

    // Daily sales
    const dailyMap = {}
    for (const s of sales) {
      const date = s.createdAt.toISOString().slice(0, 10)
      if (!dailyMap[date]) dailyMap[date] = { date, count: 0, total: 0 }
      dailyMap[date].count++
      dailyMap[date].total = parseFloat((dailyMap[date].total + toNum(s.total)).toFixed(2))
    }
    const daily_sales = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date))

    res.json({
      summary: {
        total_sales,
        total_revenue: parseFloat(total_revenue.toFixed(2)),
        total_discount: parseFloat(total_discount.toFixed(2)),
        total_tax: parseFloat(total_tax.toFixed(2)),
        avg_sale_value
      },
      by_payment_method,
      by_status,
      top_products,
      daily_sales
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.inventoryReport = async (req, res) => {
  try {
    const inventories = await prisma.inventory.findMany({
      include: {
        product: true,
        warehouse: true
      }
    })

    let total_value = 0
    let low_stock_count = 0
    const low_stock_items = []
    const whMap = {}

    for (const inv of inventories) {
      const cost = toNum(inv.product ? inv.product.cost : 0)
      const itemValue = inv.quantity * cost
      total_value += itemValue

      const isLow = inv.min_quantity > 0 && inv.quantity <= inv.min_quantity
      if (isLow) {
        low_stock_count++
        low_stock_items.push({
          product_id: inv.product_id,
          name: inv.product ? inv.product.name : 'Unknown',
          sku: inv.product ? inv.product.sku : null,
          warehouse: inv.warehouse ? inv.warehouse.name : 'Unknown',
          quantity: inv.quantity,
          min_quantity: inv.min_quantity
        })
      }

      const wid = inv.warehouse_id
      const wname = inv.warehouse ? inv.warehouse.name : 'Unknown'
      if (!whMap[wid]) whMap[wid] = { warehouse_id: wid, warehouse_name: wname, products: 0, total_qty: 0, total_value: 0 }
      whMap[wid].products++
      whMap[wid].total_qty += inv.quantity
      whMap[wid].total_value = parseFloat((whMap[wid].total_value + itemValue).toFixed(2))
    }

    const total_products = new Set(inventories.map(i => i.product_id)).size
    const by_warehouse = Object.values(whMap)

    res.json({
      summary: {
        total_products,
        total_value: parseFloat(total_value.toFixed(2)),
        low_stock_count
      },
      by_warehouse,
      low_stock_items
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.profitReport = async (req, res) => {
  try {
    const { from_date, to_date } = req.query
    const where = dateRangeWhere(from_date, to_date)

    const sales = await prisma.posSale.findMany({
      where,
      include: {
        items: {
          include: { product: true }
        }
      }
    })

    // Stock purchases total cost in date range
    const purchaseWhere = dateRangeWhere(from_date, to_date)
    const purchases = await prisma.stockPurchase.findMany({ where: purchaseWhere })
    const total_purchases_cost = purchases.reduce((sum, p) => sum + toNum(p.total), 0)

    let total_revenue = 0
    let total_cogs = 0
    const prodMap = {}

    for (const s of sales) {
      for (const item of s.items) {
        const lineRevenue = toNum(item.price) * item.quantity - toNum(item.discount)
        const lineCogs = toNum(item.cost) * item.quantity

        total_revenue += lineRevenue
        total_cogs += lineCogs

        const pid = item.product_id
        const name = item.product ? item.product.name : 'Unknown'
        if (!prodMap[pid]) prodMap[pid] = { product_id: pid, name, revenue: 0, cogs: 0, profit: 0, margin_pct: 0 }
        prodMap[pid].revenue = parseFloat((prodMap[pid].revenue + lineRevenue).toFixed(2))
        prodMap[pid].cogs = parseFloat((prodMap[pid].cogs + lineCogs).toFixed(2))
      }
    }

    const gross_profit = total_revenue - total_cogs
    const gross_margin_pct = total_revenue > 0 ? parseFloat(((gross_profit / total_revenue) * 100).toFixed(2)) : 0

    const by_product = Object.values(prodMap).map(p => {
      p.profit = parseFloat((p.revenue - p.cogs).toFixed(2))
      p.margin_pct = p.revenue > 0 ? parseFloat(((p.profit / p.revenue) * 100).toFixed(2)) : 0
      return p
    }).sort((a, b) => b.profit - a.profit)

    res.json({
      total_revenue: parseFloat(total_revenue.toFixed(2)),
      total_cogs: parseFloat(total_cogs.toFixed(2)),
      gross_profit: parseFloat(gross_profit.toFixed(2)),
      gross_margin_pct,
      total_purchases_cost: parseFloat(total_purchases_cost.toFixed(2)),
      by_product
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}

exports.deliveryReport = async (req, res) => {
  try {
    const deliveries = await prisma.delivery.findMany()

    const total = deliveries.length
    const delivered = deliveries.filter(d => d.status === 'DELIVERED').length
    const pending = deliveries.filter(d => d.status === 'PENDING').length
    const failed = deliveries.filter(d => d.status === 'FAILED').length

    // By status
    const stMap = {}
    for (const d of deliveries) {
      if (!stMap[d.status]) stMap[d.status] = { status: d.status, count: 0 }
      stMap[d.status].count++
    }
    const by_status = Object.values(stMap)

    // Avg delivery time in hours
    const completed = deliveries.filter(d => d.delivered_at && d.createdAt)
    let avg_delivery_time_hours = 0
    if (completed.length > 0) {
      const totalHours = completed.reduce((sum, d) => {
        const diffMs = new Date(d.delivered_at) - new Date(d.createdAt)
        return sum + diffMs / (1000 * 60 * 60)
      }, 0)
      avg_delivery_time_hours = parseFloat((totalHours / completed.length).toFixed(2))
    }

    res.json({
      summary: { total, delivered, pending, failed },
      by_status,
      avg_delivery_time_hours
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
