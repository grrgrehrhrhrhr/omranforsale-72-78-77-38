import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Plus, Trash2, Search, Calculator, StickyNote, AlertTriangle } from "lucide-react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { InvoicePrintTemplate } from "@/components/ui/invoice-print-template";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomers } from "@/contexts/CustomerContext";
import { inventoryManager } from "@/utils/inventoryUtils";
import { businessIntegration } from "@/utils/businessIntegration";
import { useAppIntegration } from "@/contexts/AppIntegrationContext";
import { InvoiceLoader } from "@/components/performance/FastLoader";
import { useFinancialOperation, useInventoryOperation } from "@/hooks/useRetry";
import { RetryIndicator } from "@/components/ui/retry-indicator";

interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  cost: number;
  investorCode: string;
  total: number;
  availableStock?: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
}

// No more mock customers - using CustomerContext

// Mock users without fixed codes - empty by default
const mockUsers: { name: string; code: string }[] = [];

export default function NewInvoice() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { customers, addCustomer } = useCustomers();
  const { validateStockBeforeSale, processSaleWithInventoryUpdate } = useAppIntegration();
  
  // نظام Retry للعمليات المالية والمخزونية
  const { executeFinancial, isRetrying: isFinancialRetrying, retryCount: financialRetryCount } = useFinancialOperation();
  const { executeInventory, isRetrying: isInventoryRetrying, retryCount: inventoryRetryCount } = useInventoryOperation();
  
  // حالة التحميل السريع
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // تحميل فوري للمكونات
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoading(false), 50);
    return () => clearTimeout(timer);
  }, []);
  
  // Check if we're in edit mode
  const isEditMode = searchParams.get('edit') !== null || location.state?.editMode;
  const editInvoiceId = searchParams.get('edit');
  const invoiceToEdit = location.state?.invoiceData;
  
  const [invoiceNumber, setInvoiceNumber] = useState(isEditMode && invoiceToEdit ? invoiceToEdit.id : `INV-${Date.now()}`);
  const [invoiceDate, setInvoiceDate] = useState(isEditMode && invoiceToEdit ? invoiceToEdit.date : new Date().toISOString().split('T')[0]);
  const [invoiceTime, setInvoiceTime] = useState(isEditMode && invoiceToEdit ? invoiceToEdit.time || new Date().toTimeString().split(' ')[0] : new Date().toTimeString().split(' ')[0]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>(isEditMode && invoiceToEdit ? invoiceToEdit.customerId : "");
  const [userName, setUserName] = useState<string>(isEditMode && invoiceToEdit ? invoiceToEdit.userName : "");
  const [userCode, setUserCode] = useState<string>(isEditMode && invoiceToEdit ? invoiceToEdit.userCode : "");
  const [invoiceType, setInvoiceType] = useState<string>(isEditMode && invoiceToEdit ? invoiceToEdit.invoiceType : "retail");
  const [paymentStatus, setPaymentStatus] = useState<string>(isEditMode && invoiceToEdit ? invoiceToEdit.paymentStatus : "pending");
  const [paymentMethod, setPaymentMethod] = useState<string>(isEditMode && invoiceToEdit ? invoiceToEdit.paymentMethod : "cash");
  const [items, setItems] = useState<InvoiceItem[]>(isEditMode && invoiceToEdit ? invoiceToEdit.itemsDetails || [] : []);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [productSearchOpen, setProductSearchOpen] = useState<boolean>(false);
  const [productSearchValue, setProductSearchValue] = useState<string>("");
  const [filteredProducts, setFilteredProducts] = useState<Array<{
    id: string;
    name: string;
    code: string;
    price: number;
    cost: number;
    category: string;
    stock: number;
    investorCode: string;
  }>>([]);
  const [taxRate, setTaxRate] = useState(14); // 14% VAT
  const [discountAmount, setDiscountAmount] = useState<number>(isEditMode && invoiceToEdit ? invoiceToEdit.discountAmount : NaN);
  const [discountPercentage, setDiscountPercentage] = useState<number>(isEditMode && invoiceToEdit ? invoiceToEdit.discountPercentage : NaN);
  const [notes, setNotes] = useState<string>(isEditMode && invoiceToEdit ? invoiceToEdit.notes : "");
  const [invoiceCost, setInvoiceCost] = useState<number>(0);
  const [amountSoldFor, setAmountSoldFor] = useState<number>(0);
  
  // Customer selection states
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchValue, setCustomerSearchValue] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerCode, setNewCustomerCode] = useState("");

  // Handle user selection and auto-fill user code
  const handleUserNameChange = (value: string) => {
    setUserName(value);
    // Generate user code if not existing user
    if (value && !userCode) {
      setUserCode("");
    }
  };

  // Filter products based on search and initialize all products
  useEffect(() => {
    const allProducts = inventoryManager.getProducts().map(p => ({
      id: p.id,
      name: p.name,
      code: p.code,
      price: p.price,
      cost: p.cost,
      category: p.category,
      stock: p.stock,
      investorCode: p.ownerId || ''
    }));

    if (productSearchValue.trim() === "") {
      // Show all products when no search term
      setFilteredProducts(allProducts);
      return;
    }
    
    const filtered = (allProducts || []).filter(product =>
      product.name.toLowerCase().includes(productSearchValue.toLowerCase()) ||
      product.code.toLowerCase().includes(productSearchValue.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [productSearchValue]);

  const addItem = () => {
    if (!selectedProduct) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار منتج",
        variant: "destructive",
      });
      return;
    }

    const product = filteredProducts.find(p => p.name === selectedProduct);
    if (!product) return;

    // Check stock availability using integrated system
    const stockCheck = validateStockBeforeSale(product.id, quantity);
    if (!stockCheck.valid) {
      toast({
        title: "كمية غير متاحة",
        description: stockCheck.message,
        variant: "destructive",
      });
      return;
    }

    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      productId: product.id,
      productName: product.name,
      quantity,
      price: product.price,
      cost: product.cost,
      investorCode: product.investorCode || '',
      total: quantity * product.price,
      availableStock: product.stock,
    };

    setItems([...items, newItem]);
    setSelectedProduct("");
    setProductSearchValue("");
    setQuantity(1);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    
    const item = items.find(i => i.id === id);
    if (item) {
      // Check stock availability for updated quantity using integrated system
      const stockCheck = validateStockBeforeSale(item.productId, newQuantity);
      if (!stockCheck.valid) {
        toast({
          title: "كمية غير متاحة",
          description: stockCheck.message,
          variant: "destructive",
        });
        return;
      }
    }
    
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
        : item
    ));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const validDiscountAmount = isNaN(discountAmount) ? 0 : discountAmount;
  const validDiscountPercentage = isNaN(discountPercentage) ? 0 : discountPercentage;
  const percentageDiscount = (subtotal * validDiscountPercentage) / 100;
  const totalDiscount = validDiscountAmount + percentageDiscount;
  const subtotalAfterDiscount = subtotal - totalDiscount;
  const taxAmount = (subtotalAfterDiscount * taxRate) / 100;
  const total = subtotalAfterDiscount + taxAmount;
  
  // حساب تكلفة الفاتورة والمبلغ المباع به تلقائياً
  const calculatedInvoiceCost = items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
  const calculatedAmountSoldFor = total;
  const netProfit = calculatedAmountSoldFor - calculatedInvoiceCost;
  const profitPercentage = calculatedInvoiceCost > 0 ? (netProfit / calculatedInvoiceCost) * 100 : 0;

  const handleSave = async () => {
    if (!selectedCustomer && !newCustomerName.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار عميل أو إدخال اسم عميل جديد",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى إضافة منتج واحد على الأقل",
        variant: "destructive",
      });
      return;
    }

    let customer = customers.find(c => c.id.toString() === selectedCustomer);
    
    // If no customer selected but new customer name provided, create new customer
    if (!customer && newCustomerName.trim()) {
      const newCustomer = {
        name: newCustomerName.trim(),
        email: "",
        phone: "",
        address: ""
      };
      addCustomer(newCustomer);
      
      // Find the newly added customer
      const updatedCustomers = [...customers];
      const newId = Math.max(...updatedCustomers.map(c => c.id), 0) + 1;
      customer = {
        id: newId,
        name: newCustomerName.trim(),
        email: "",
        phone: "",
        address: "",
        totalOrders: 0,
        totalSpent: 0,
        status: "نشط",
        createdAt: new Date()
      };
    }
    
    const invoiceData = {
      id: invoiceNumber,
      customerName: customer?.name || 'عميل غير محدد',
      customerPhone: customer?.phone || '',
      date: invoiceDate,
      items: items.length,
      total: total,
      status: paymentStatus === 'paid' ? 'مدفوعة' : paymentStatus === 'pending' ? 'معلقة' : 'ملغية',
      paymentMethod: paymentMethod === 'cash' ? 'نقداً' : 'آجل',
      invoiceNumber,
      customerId: customer?.id?.toString() || selectedCustomer,
      userName,
      userCode,
      invoiceType,
      paymentStatus,
      discountAmount: validDiscountAmount,
      discountPercentage: validDiscountPercentage,
      totalDiscount,
      notes,
      invoiceCost: calculatedInvoiceCost,
      amountSoldFor: calculatedAmountSoldFor,
      netProfit,
      itemsDetails: items,
      subtotal,
      subtotalAfterDiscount,
      taxAmount
    };

    try {
      // حفظ الفاتورة مع نظام Retry للعمليات المالية
      await executeFinancial(async () => {
        // حفظ أو تحديث الفاتورة في localStorage
        const existingInvoices = localStorage.getItem('sales_invoices');
        let invoicesArray = [];
        
        if (existingInvoices) {
          try {
            invoicesArray = JSON.parse(existingInvoices);
          } catch (error) {
            console.error('Error parsing existing invoices:', error);
            invoicesArray = [];
          }
        }
        
        if (isEditMode) {
          // تحديث الفاتورة الموجودة
          const invoiceIndex = invoicesArray.findIndex((inv: any) => inv.id === invoiceNumber);
          if (invoiceIndex !== -1) {
            invoicesArray[invoiceIndex] = invoiceData;
          }
        } else {
          // إضافة فاتورة جديدة
          invoicesArray.push(invoiceData);
        }
        
        localStorage.setItem('sales_invoices', JSON.stringify(invoicesArray));
        return invoiceData;
      }, 'save_invoice');

      // معالجة المخزون تلقائياً لجميع الفواتير (مدفوعة أو معلقة)
      await executeInventory(async () => {
        const success = await processSaleWithInventoryUpdate(invoiceData);
        if (!success) {
          throw new Error('فشل في تحديث المخزون');
        }
        
        // ربط مع الصندوق فقط إذا كانت الفاتورة مدفوعة
        if (paymentStatus === 'paid') {
          const { cashFlowManager } = await import('@/utils/cashFlowManager');
          cashFlowManager.addTransaction({
            date: new Date().toISOString(),
            type: 'income',
            category: 'sales',
            amount: total,
            description: `مبيعات - فاتورة رقم ${invoiceNumber}`,
            referenceId: invoiceNumber,
            referenceType: 'sales_invoice',
            paymentMethod: paymentMethod === 'cash' ? 'cash' : 'credit',
            notes: `ربط تلقائي مع الصندوق - عميل: ${invoiceData.customerName}`
          });
        }
        
        // Refresh products list to show updated stock
        const updatedProducts = inventoryManager.getProducts().map(p => ({
          id: p.id,
          name: p.name,
          code: p.code,
          price: p.price,
          cost: p.cost,
          category: p.category,
          stock: p.stock,
          investorCode: p.ownerId || ''
        }));
        setFilteredProducts(updatedProducts);
        
        return success;
      }, 'update_inventory');

      toast({
        title: isEditMode ? "تم التحديث" : "تم الحفظ",
        description: isEditMode ? "تم تحديث الفاتورة بنجاح" : "تم حفظ الفاتورة بنجاح",
      });
      
      console.log(isEditMode ? "Invoice updated:" : "Invoice saved:", invoiceData);
      return true;

    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: "خطأ في الحفظ",
        description: error instanceof Error ? error.message : "حدث خطأ أثناء حفظ الفاتورة",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSaveAndPrint = async () => {
    const saved = await handleSave();
    if (saved) {
      // استخدام نظام الطباعة المحسن
      const invoicePrintData = {
        id: invoiceNumber,
        customerName: selectedCustomer ? customers.find(c => c.id.toString() === selectedCustomer)?.name || 'عميل غير محدد' : newCustomerName.trim() || 'عميل غير محدد',
        customerPhone: selectedCustomer ? customers.find(c => c.id.toString() === selectedCustomer)?.phone : '',
        date: invoiceDate,
        items: items,
        total: total,
        subtotal: subtotal,
        taxAmount: taxAmount,
        discountAmount: totalDiscount,
        notes: notes,
        paymentMethod: paymentMethod === 'cash' ? 'نقداً' : 'آجل',
        status: paymentStatus === 'paid' ? 'مدفوعة' : paymentStatus === 'pending' ? 'معلقة' : 'ملغية'
      };

      // طباعة فورية باستخدام القالب القياسي
      const printContent = generatePrintContent();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  const generatePrintContent = () => {
    const customer = customers.find(c => c.id.toString() === selectedCustomer) || 
                    (newCustomerName.trim() ? { name: newCustomerName, phone: '' } : null);
    
    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>فاتورة ${invoiceNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            direction: rtl;
            background: white;
          }
          .invoice-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .invoice-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .info-section {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
          }
          .info-section h3 {
            margin-top: 0;
            color: #333;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .items-table th,
          .items-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: center;
          }
          .items-table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .totals {
            margin-right: auto;
            width: 300px;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .total-final {
            font-weight: bold;
            font-size: 18px;
            border-top: 2px solid #333;
            padding-top: 10px;
            margin-top: 10px;
          }
          .thank-you {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 5px;
            font-size: 18px;
            font-weight: bold;
            color: #2563eb;
          }
          .user-info {
            margin-top: 30px;
            text-align: left;
            font-size: 14px;
            color: #666;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <h1>فاتورة مبيعات</h1>
          <h2>رقم الفاتورة: ${invoiceNumber}</h2>
        </div>

        <div class="invoice-info">
          <div class="info-section">
            <h3>بيانات العميل</h3>
            <p><strong>الاسم:</strong> ${customer?.name || 'غير محدد'}</p>
            <p><strong>رقم الهاتف:</strong> ${customer?.phone || 'غير محدد'}</p>
          </div>
          
           <div class="info-section">
             <h3>بيانات الفاتورة</h3>
             <p><strong>نوع الفاتورة:</strong> ${invoiceType === 'retail' ? 'تجزئة' : 'جملة'}</p>
             <p><strong>تاريخ الفاتورة:</strong> ${new Date(invoiceDate).toLocaleDateString('ar-EG')}</p>
             <p><strong>معدل الضريبة:</strong> ${taxRate}%</p>
             <p><strong>حالة الدفع:</strong> ${paymentStatus === 'paid' ? 'مدفوعة' : paymentStatus === 'pending' ? 'معلقة' : 'ملغية'}</p>
             <p><strong>طريقة الدفع:</strong> ${paymentMethod === 'cash' ? 'نقداً' : 'آجل'}</p>
             ${userName ? `<p><strong>المستخدم:</strong> ${userName}</p>` : ''}
             ${userCode ? `<p><strong>كود المستخدم:</strong> ${userCode}</p>` : ''}
           </div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>المنتج</th>
              <th>السعر</th>
              <th>الكمية</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td>${item.price} ج.م</td>
                <td>${item.quantity}</td>
                <td>${item.total} ج.م</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row">
            <span>المجموع الفرعي:</span>
            <span>${subtotal.toFixed(2)} ج.م</span>
          </div>
          ${totalDiscount > 0 ? `
            <div class="total-row">
              <span>الخصم المطبق:</span>
              <span style="color: #dc2626;">-${totalDiscount.toFixed(2)} ج.م</span>
            </div>
            <div class="total-row">
              <span>المجموع بعد الخصم:</span>
              <span>${subtotalAfterDiscount.toFixed(2)} ج.م</span>
            </div>
          ` : ''}
          <div class="total-row">
            <span>ضريبة القيمة المضافة (${taxRate}%):</span>
            <span>${taxAmount.toFixed(2)} ج.م</span>
          </div>
          <div class="total-row total-final">
            <span>الإجمالي:</span>
            <span>${total.toFixed(2)} ج.م</span>
          </div>
        </div>

        ${notes ? `
          <div style="margin-top: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; background-color: #f9f9f9;">
            <h3 style="margin-top: 0; color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">ملاحظات:</h3>
            <p style="margin: 0; line-height: 1.6;">${notes}</p>
          </div>
        ` : ''}

        <div class="thank-you">
          شكراً لثقتكم في منتجاتنا
        </div>

        ${userName ? `
          <div class="user-info">
            تم طباعة هذه الفاتورة بواسطة: ${userName} (${userCode})
          </div>
        ` : ''}
      </body>
      </html>
    `;
  };

  
  // عرض شاشة تحميل سريعة
  if (isInitialLoading) {
    return <InvoiceLoader />;
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/sales/invoices")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-mada-heading">{isEditMode ? 'تعديل فاتورة المبيعات' : 'فاتورة مبيعات جديدة'}</h1>
            <p className="text-muted-foreground">{isEditMode ? 'تعديل بيانات الفاتورة' : 'إنشاء فاتورة مبيعات جديدة'}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {invoiceNumber}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Invoice Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                بيانات الفاتورة
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="customer">العميل *</Label>
                <div className="space-y-2">
                  <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={customerSearchOpen}
                        className="w-full justify-between"
                      >
                        {selectedCustomer
                          ? customers.find((customer) => customer.id.toString() === selectedCustomer)?.name
                          : newCustomerName.trim()
                          ? newCustomerName
                          : "اختر العميل أو أدخل اسم جديد"}
                        <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput 
                          placeholder="ابحث عن العميل أو أدخل اسم جديد..." 
                          value={customerSearchValue}
                          onValueChange={setCustomerSearchValue}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <div className="p-4 space-y-2">
                              <p className="text-sm text-muted-foreground">لم يتم العثور على عميل بهذا الاسم</p>
                              {customerSearchValue.trim() && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setNewCustomerName(customerSearchValue.trim());
                                    setSelectedCustomer("");
                                    setCustomerSearchOpen(false);
                                    setCustomerSearchValue("");
                                  }}
                                  className="w-full"
                                >
                                  إنشاء عميل جديد: "{customerSearchValue.trim()}"
                                </Button>
                              )}
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {customers
                              .filter(customer => 
                                customer.name.toLowerCase().includes(customerSearchValue.toLowerCase())
                              )
                              .map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  value={customer.name}
                                  onSelect={() => {
                                    setSelectedCustomer(customer.id.toString());
                                    setNewCustomerName("");
                                    setCustomerSearchOpen(false);
                                    setCustomerSearchValue("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedCustomer === customer.id.toString() ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{customer.name}</span>
                                    <span className="text-sm text-muted-foreground">{customer.phone}</span>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {newCustomerName.trim() && (
                    <p className="text-sm text-muted-foreground">
                      سيتم إنشاء عميل جديد: {newCustomerName}
                    </p>
                  )}
                </div>
              </div>
               <div>
                 <Label htmlFor="customerNumber">رقم العميل</Label>
                 <Input
                   id="customerNumber"
                   type="text"
                   value={newCustomerName.trim() ? newCustomerCode : selectedCustomer || ""}
                   onChange={(e) => {
                     if (newCustomerName.trim()) {
                       setNewCustomerCode(e.target.value);
                     }
                   }}
                   readOnly={!newCustomerName.trim()}
                   placeholder={newCustomerName.trim() ? "أدخل رقم العميل الجديد" : "يتم ملؤه تلقائياً"}
                   className={newCustomerName.trim() ? "" : "bg-muted"}
                 />
               </div>
              <div>
                <Label htmlFor="invoiceType">نوع الفاتورة</Label>
                <Select value={invoiceType} onValueChange={setInvoiceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الفاتورة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">تجزئة</SelectItem>
                    <SelectItem value="wholesale">جملة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="userName">اسم المستخدم</Label>
                <Select value={userName} onValueChange={handleUserNameChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المستخدم" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockUsers.map((user) => (
                      <SelectItem key={user.code} value={user.name}>
                        <div className="flex flex-col">
                          <span>{user.name}</span>
                          <span className="text-sm text-muted-foreground">{user.code}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="userCode">كود المستخدم</Label>
                <Input
                  id="userCode"
                  type="text"
                  value={userCode}
                  readOnly
                  placeholder="يتم ملؤه تلقائياً"
                  className="bg-muted"
                />
              </div>
               <div>
                 <Label htmlFor="date">تاريخ الفاتورة</Label>
                 <Input 
                   id="date" 
                   type="date" 
                   value={invoiceDate}
                   onChange={(e) => setInvoiceDate(e.target.value)}
                 />
               </div>
               <div>
                 <Label htmlFor="time">وقت الفاتورة</Label>
                 <Input 
                   id="time" 
                   type="time"
                   step="1"
                   value={invoiceTime}
                   readOnly
                   className="bg-muted"
                 />
               </div>
              <div>
                <Label htmlFor="taxRate">معدل الضريبة (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  placeholder="14"
                />
              </div>
              <div>
                <Label htmlFor="discountAmount">الخصم (ج.م)</Label>
                 <Input
                   id="discountAmount"
                   type="number"
                   min="0"
                   step="0.01"
                   value={isNaN(discountAmount) ? "" : discountAmount}
                   onChange={(e) => setDiscountAmount(e.target.value === "" ? NaN : Number(e.target.value))}
                   placeholder=""
                 />
              </div>
              <div>
                <Label htmlFor="discountPercentage">الخصم (%)</Label>
                 <Input
                   id="discountPercentage"
                   type="number"
                   min="0"
                   max="100"
                   step="0.1"
                   value={isNaN(discountPercentage) ? "" : discountPercentage}
                   onChange={(e) => setDiscountPercentage(e.target.value === "" ? NaN : Number(e.target.value))}
                   placeholder=""
                 />
              </div>
              <div>
                <Label htmlFor="paymentStatus">حالة الدفع</Label>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر حالة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">مدفوعة</SelectItem>
                    <SelectItem value="pending">معلقة</SelectItem>
                    <SelectItem value="canceled">ملغية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentMethod">طريقة الدفع</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقداً</SelectItem>
                    <SelectItem value="credit">آجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Add Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                إضافة منتجات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="md:col-span-2">
                  <Label>المنتج</Label>
                  <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={productSearchOpen}
                        className="w-full justify-between"
                      >
                        {selectedProduct || "اختر المنتج أو ابحث بالاسم..."}
                        <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput 
                          placeholder="ابحث عن المنتج..." 
                          value={productSearchValue}
                          onValueChange={setProductSearchValue}
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>لا توجد منتجات مطابقة للبحث</CommandEmpty>
                          <CommandGroup>
                            {filteredProducts.map((product) => (
                              <CommandItem
                                key={product.id}
                                value={product.name}
                                onSelect={() => {
                                  setSelectedProduct(product.name);
                                  setProductSearchOpen(false);
                                  setProductSearchValue("");
                                }}
                                className="flex justify-between items-center p-3"
                              >
                                 <div className="flex flex-col flex-1">
                                   <span className="font-medium">{product.name}</span>
                                   <span className="text-xs text-muted-foreground">
                                     كود: {product.code} | فئة: {product.category}
                                   </span>
                                   <span className="text-xs text-muted-foreground">
                                     كود المستثمر: {product.investorCode}
                                   </span>
                                 </div>
                                 <div className="flex flex-col items-end mr-4">
                                   <span className="text-sm font-medium">{product.price} ج.م</span>
                                   <span className="text-xs text-muted-foreground">التكلفة: {product.cost} ج.م</span>
                                   <span className={`text-xs font-medium ${
                                     product.stock === 0 ? 'text-red-500' : 
                                     product.stock <= 5 ? 'text-yellow-500' : 'text-green-500'
                                   }`}>
                                     متوفر: {product.stock} قطعة
                                   </span>
                                 </div>
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedProduct === product.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>الكمية</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={addItem} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    إضافة
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>المنتجات المضافة</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead>كود المستثمر</TableHead>
                      <TableHead>السعر</TableHead>
                      <TableHead>التكلفة</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>الإجمالي</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{item.productName}</span>
                            {item.availableStock && item.availableStock <= 5 && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 ml-1" />
                                مخزون قليل
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {item.investorCode}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.price} ج.م</TableCell>
                        <TableCell className="text-muted-foreground">{item.cost} ج.م</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.total} ج.م</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                ملاحظات الفاتورة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="أضف أي ملاحظات خاصة بالفاتورة..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Cost & Profit Tracking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                تتبع التكلفة والربح
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceCost">تكلفة الفاتورة (ج.م)</Label>
                <Input
                  id="invoiceCost"
                  type="number"
                  value={calculatedInvoiceCost.toFixed(2)}
                  readOnly
                  placeholder="يتم حسابها تلقائياً"
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">يتم حسابها تلقائياً من تكلفة المنتجات</p>
              </div>
              <div>
                <Label htmlFor="amountSoldFor">المبلغ المباع به (ج.م)</Label>
                <Input
                  id="amountSoldFor"
                  type="number"
                  value={calculatedAmountSoldFor.toFixed(2)}
                  readOnly
                  placeholder="يتم حسابه تلقائياً"
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">يتم حسابه تلقائياً من إجمالي الفاتورة</p>
              </div>
              <div>
                <Label>صافي الربح</Label>
                <div className={`p-3 border rounded-md text-center font-bold text-lg ${
                  netProfit >= 0 ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'
                }`}>
                  {netProfit.toFixed(2)} ج.م
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  المبلغ المباع به ({calculatedAmountSoldFor.toFixed(2)} ج.م) - تكلفة الفاتورة ({calculatedInvoiceCost.toFixed(2)} ج.م)
                </p>
              </div>
              <div>
                <Label>نسبة الربح</Label>
                <div className={`p-3 border rounded-md text-center font-bold text-lg ${
                  profitPercentage >= 0 ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-red-600 bg-red-50 border-red-200'
                }`}>
                  {profitPercentage.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  يتم حسابها تلقائياً: (صافي الربح ÷ التكلفة) × 100
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                ملخص الفاتورة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>المجموع الفرعي:</span>
                <span>{subtotal.toFixed(2)} ج.م</span>
              </div>
              {totalDiscount > 0 && (
                <>
                  <div className="flex justify-between text-sm text-destructive">
                    <span>الخصم المطبق:</span>
                    <span>-{totalDiscount.toFixed(2)} ج.م</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>المجموع بعد الخصم:</span>
                    <span>{subtotalAfterDiscount.toFixed(2)} ج.م</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm">
                <span>ضريبة القيمة المضافة ({taxRate}%):</span>
                <span>{taxAmount.toFixed(2)} ج.م</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>الإجمالي:</span>
                  <span className="text-primary">{total.toFixed(2)} ج.م</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>الإجراءات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleSave} 
                className="w-full"
                disabled={isFinancialRetrying || isInventoryRetrying}
              >
                {isFinancialRetrying || isInventoryRetrying ? 'جاري الحفظ...' : 'حفظ الفاتورة'}
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleSaveAndPrint}
                disabled={isFinancialRetrying || isInventoryRetrying}
              >
                حفظ وطباعة
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => navigate("/sales/invoices")}>
                إلغاء
              </Button>
              
              {/* مؤشرات نظام Retry */}
              {isFinancialRetrying && (
                <RetryIndicator
                  isRetrying={isFinancialRetrying}
                  retryCount={financialRetryCount}
                  maxRetries={5}
                  operation="حفظ الفاتورة"
                />
              )}
              
              {isInventoryRetrying && (
                <RetryIndicator
                  isRetrying={isInventoryRetrying}
                  retryCount={inventoryRetryCount}
                  maxRetries={3}
                  operation="تحديث المخزون"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}