"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  CreditCard,
  Truck,
  User,
  Phone,
  Mail,
  Tag,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Home,
  Info,
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { authClient } from "@/lib/auth-client";
import { formatPrice } from "@/lib/formatters";

export interface DeliveryMethodDto {
  _id: string;
  code: string;
  title: string;
  price: number; // in kopecks
  description: string;
  isActive: boolean;
}

export interface SavedAddressDto {
  _id: string;
  city: string;
  street: string;
  house: string;
  apartment?: string;
  postalCode: string;
  comment?: string;
}

interface CheckoutContentProps {
  initialDeliveryMethods: DeliveryMethodDto[];
}

export function CheckoutContent({ initialDeliveryMethods }: CheckoutContentProps) {
  const { items, totalAmount, totalQuantity, isLoading: isCartLoading, clearCart } = useCart();
  const { data: session, isPending: isAuthPending } = authClient.useSession();

  // Delivery methods state
  const [deliveryMethods] = useState<DeliveryMethodDto[]>(initialDeliveryMethods);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string>(
    initialDeliveryMethods[0]?._id || ""
  );

  // Saved addresses state (for authorized users)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddressDto[]>([]);
  const [selectedAddressMode, setSelectedAddressMode] = useState<"saved" | "new">("new");
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string>("");

  // Form Fields: Contact
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pdConsent, setPdConsent] = useState(true);

  // Form Fields: Address
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [house, setHouse] = useState("");
  const [apartment, setApartment] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [deliveryComment, setDeliveryComment] = useState("");
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(false);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<"card_online" | "cod">("card_online");

  // Order notes
  const [customerComment, setCustomerComment] = useState("");

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountType: "percentage" | "fixed";
    discountValue: number;
    discountAmount: number;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<{
    number: string;
    finalAmount: number;
    paymentMethod: string;
    status: string;
    deliveryTitle: string;
    contactName: string;
    paymentId?: string;
  } | null>(null);

  // Populate contact fields when user logs in
  useEffect(() => {
    if (session?.user) {
      if (!fullName && session.user.name) setFullName(session.user.name);
      if (!email && session.user.email) setEmail(session.user.email);
      const userPhone = (session.user as unknown as { phone?: string }).phone;
      if (!phone && userPhone) setPhone(userPhone);

      // Fetch saved addresses
      fetch("/api/addresses")
        .then((res) => (res.ok ? res.json() : { addresses: [] }))
        .then((data) => {
          if (data.addresses && data.addresses.length > 0) {
            setSavedAddresses(data.addresses);
            setSelectedAddressMode("saved");
            setSelectedSavedAddressId(data.addresses[0]._id);
            const first = data.addresses[0];
            setCity(first.city);
            setStreet(first.street);
            setHouse(first.house);
            setApartment(first.apartment || "");
            setPostalCode(first.postalCode);
            setDeliveryComment(first.comment || "");
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  // Handle switching between saved addresses
  const handleSelectSavedAddress = (addr: SavedAddressDto) => {
    setSelectedSavedAddressId(addr._id);
    setSelectedAddressMode("saved");
    setCity(addr.city);
    setStreet(addr.street);
    setHouse(addr.house);
    setApartment(addr.apartment || "");
    setPostalCode(addr.postalCode);
    setDeliveryComment(addr.comment || "");
  };

  const handleSelectNewAddressMode = () => {
    setSelectedAddressMode("new");
    setSelectedSavedAddressId("");
    setCity("");
    setStreet("");
    setHouse("");
    setApartment("");
    setPostalCode("");
    setDeliveryComment("");
  };

  // Selected delivery method price
  const selectedDelivery = deliveryMethods.find((d) => d._id === selectedDeliveryId) || deliveryMethods[0];
  const deliveryCost = selectedDelivery ? selectedDelivery.price : 0;

  // Recalculate discount if items change
  const discountAmount = appliedPromo ? appliedPromo.discountAmount : 0;
  const finalAmount = Math.max(0, totalAmount - discountAmount) + deliveryCost;

  // Apply promo code handler
  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;

    setIsValidatingPromo(true);
    setPromoError(null);

    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: promoInput.trim().toUpperCase(),
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          totalAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Неверный промокод");
      }

      setAppliedPromo({
        code: data.promo.code,
        discountType: data.promo.discountType,
        discountValue: data.promo.discountValue,
        discountAmount: data.discountAmount,
      });
      setPromoInput("");
    } catch (err: unknown) {
      setPromoError(err instanceof Error ? err.message : "Ошибка проверки промокода");
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
  };

  // Form submission handler
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (items.length === 0) {
      setSubmitError("Корзина пуста. Добавьте товары перед оформлением заказа.");
      return;
    }

    if (!pdConsent) {
      setSubmitError("Необходимо дать согласие на обработку персональных данных (152-ФЗ).");
      return;
    }

    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      setSubmitError("Пожалуйста, заполните все контактные данные (ФИО, телефон, email).");
      return;
    }

    if (!city.trim() || !street.trim() || !house.trim() || !postalCode.trim()) {
      setSubmitError("Пожалуйста, заполните обязательные поля адреса доставки (город, улица, дом, индекс).");
      return;
    }

    if (!selectedDeliveryId) {
      setSubmitError("Пожалуйста, выберите способ доставки.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        contact: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
        },
        shippingAddress: {
          city: city.trim(),
          street: street.trim(),
          house: house.trim(),
          apartment: apartment.trim(),
          postalCode: postalCode.trim(),
          comment: deliveryComment.trim(),
        },
        deliveryMethodId: selectedDeliveryId,
        paymentMethod,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        promoCode: appliedPromo ? appliedPromo.code : undefined,
        customerComment: customerComment.trim(),
        saveAddress: session?.user ? saveAddressToProfile : false,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Не удалось оформить заказ. Попробуйте снова.");
      }

      // Success: Clear cart
      await clearCart();

      setCreatedOrder({
        number: data.order.number,
        finalAmount: data.order.finalAmount,
        paymentMethod: data.order.paymentMethod,
        status: data.order.status,
        deliveryTitle: data.order.delivery.title,
        contactName: data.order.contact.fullName,
        paymentId: data.payment?._id || data.payment?.externalPaymentId,
      });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Произошла непредвиденная ошибка");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Loading State
  if (isCartLoading && items.length === 0) {
    return (
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center min-h-[450px]">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-sm text-muted-foreground animate-pulse">Загрузка данных заказа...</p>
      </div>
    );
  }

  // 2. Success State: Order placed
  if (createdOrder) {
    return (
      <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div
          id="checkout-success-card"
          className="rounded-3xl border border-emerald-500/20 bg-card p-6 sm:p-10 shadow-xl shadow-emerald-500/5 text-center"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 mb-6">
            <CheckCircle2 className="h-12 w-12" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 mb-3">
            Заказ успешно оформлен
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Спасибо за покупку, {createdOrder.contactName}!
          </h1>

          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            Ваш заказ принят в обработку. Номер заказа:
          </p>

          <div className="mt-4 inline-block bg-muted px-6 py-3 rounded-2xl border border-border">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-wide">
              {createdOrder.number}
            </span>
          </div>

          {/* Details summary */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left bg-muted/40 p-4 sm:p-6 rounded-2xl border border-border/60">
            <div>
              <p className="text-xs text-muted-foreground">Сумма заказа</p>
              <p className="text-base font-bold text-foreground mt-0.5">
                {formatPrice(createdOrder.finalAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Способ оплаты</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {createdOrder.paymentMethod === "card_online" ? "Картой онлайн" : "При получении"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Доставка</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {createdOrder.deliveryTitle}
              </p>
            </div>
          </div>

          {/* Online payment banner if card_online */}
          {createdOrder.paymentMethod === "card_online" && (
            <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-foreground">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Статус оплаты: Ожидает оплаты (pending)
                </p>
                <p className="text-muted-foreground mt-1">
                  Запись платежа создана в системе. Вы сможете перейти к безопасной тестовой оплате картой в следующем этапе T07.
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/catalog"
              id="checkout-continue-shopping"
              className="w-full sm:w-auto h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Продолжить покупки</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Empty cart guard
  if (items.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Ваша корзина пуста</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Для оформления заказа добавьте хотя бы один товар в корзину.
        </p>
        <div className="mt-6">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            <span>В каталог товаров</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // 4. Main Checkout Form
  return (
    <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-6">
        <Link href="/" className="hover:text-foreground transition-colors">
          Главная
        </Link>
        <span>/</span>
        <Link href="/cart" className="hover:text-foreground transition-colors">
          Корзина
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Оформление заказа</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Оформление заказа
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Заполните данные для доставки и выберите удобный способ оплаты
        </p>
      </div>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Checkout Sections */}
        <div className="lg:col-span-8 space-y-6">
          {/* Guest account callout */}
          {!session?.user && !isAuthPending && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-emerald-600 shrink-0" />
                <p className="text-xs sm:text-sm text-foreground">
                  Оформляете как гость. <span className="font-semibold">Уже есть аккаунт?</span>
                </p>
              </div>
              <Link
                href="/login?callbackUrl=/checkout"
                className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
              >
                Войти в профиль →
              </Link>
            </div>
          )}

          {/* Section 1: Контактные данные */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/60">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold text-sm">
                1
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Контактные данные</h2>
                <p className="text-xs text-muted-foreground">
                  Мы сообщим вам статус заказа по телефону и почте
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="checkout-name">
                  ФИО получателя <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="checkout-name"
                    type="text"
                    required
                    placeholder="Иванов Иван Иванович"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="checkout-phone">
                  Телефон <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="checkout-phone"
                    type="tel"
                    required
                    placeholder="+7 (999) 000-00-00"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="checkout-email">
                  Электронная почта <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    id="checkout-email"
                    type="email"
                    required
                    placeholder="ivanov@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* 152-FZ Mandatory Consent */}
            <div className="mt-5 flex items-start gap-2.5">
              <input
                id="checkout-pd-consent"
                type="checkbox"
                checked={pdConsent}
                onChange={(e) => setPdConsent(e.target.checked)}
                className="h-4 w-4 mt-0.5 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="checkout-pd-consent" className="text-xs text-muted-foreground cursor-pointer">
                Я даю согласие на обработку персональных данных в соответствии со статьёй 9 Федерального закона № 152-ФЗ «О персональных данных» и{" "}
                <Link href="/privacy" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                  Политикой конфиденциальности
                </Link>
                .
              </label>
            </div>
          </div>

          {/* Section 2: Адрес доставки */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/60">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold text-sm">
                2
              </div>
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Адрес доставки</h2>
                  <p className="text-xs text-muted-foreground">Куда доставить ваш заказ</p>
                </div>

                {/* For logged in users with saved addresses: Mode Toggle */}
                {session?.user && savedAddresses.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedAddressMode("saved")}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        selectedAddressMode === "saved"
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Сохранённые ({savedAddresses.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectNewAddressMode}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        selectedAddressMode === "new"
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Новый адрес
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Saved addresses selector if mode == saved */}
            {session?.user && selectedAddressMode === "saved" && savedAddresses.length > 0 && (
              <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedAddresses.map((addr) => {
                  const isSelected = selectedSavedAddressId === addr._id;
                  return (
                    <div
                      key={addr._id}
                      onClick={() => handleSelectSavedAddress(addr)}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "border-emerald-600 bg-emerald-500/5 ring-2 ring-emerald-500/20"
                          : "border-border hover:border-border/80 bg-background"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs font-bold text-foreground">{addr.city}</span>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        ул. {addr.street}, д. {addr.house}
                        {addr.apartment ? `, кв. ${addr.apartment}` : ""}
                        <br />
                        Индекс: {addr.postalCode}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Address input fields (shown always for guest or when new mode selected) */}
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="checkout-city">
                  Город <span className="text-destructive">*</span>
                </label>
                <input
                  id="checkout-city"
                  type="text"
                  required
                  placeholder="Москва"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="checkout-street">
                  Улица <span className="text-destructive">*</span>
                </label>
                <input
                  id="checkout-street"
                  type="text"
                  required
                  placeholder="ул. Ленина"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="checkout-house">
                  Дом <span className="text-destructive">*</span>
                </label>
                <input
                  id="checkout-house"
                  type="text"
                  required
                  placeholder="10"
                  value={house}
                  onChange={(e) => setHouse(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="checkout-apartment">
                  Кв. / Офис
                </label>
                <input
                  id="checkout-apartment"
                  type="text"
                  placeholder="24"
                  value={apartment}
                  onChange={(e) => setApartment(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="checkout-postal">
                  Почтовый индекс <span className="text-destructive">*</span>
                </label>
                <input
                  id="checkout-postal"
                  type="text"
                  required
                  placeholder="101000"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-6">
                <label className="block text-xs font-medium text-foreground mb-1.5" htmlFor="checkout-comment">
                  Комментарий для курьера
                </label>
                <input
                  id="checkout-comment"
                  type="text"
                  placeholder="Подъезд 2, этаж 5, домофон #1234"
                  value={deliveryComment}
                  onChange={(e) => setDeliveryComment(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Checkbox to save address if logged in */}
            {session?.user && selectedAddressMode === "new" && (
              <div className="mt-4 flex items-center gap-2">
                <input
                  id="checkout-save-address"
                  type="checkbox"
                  checked={saveAddressToProfile}
                  onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="checkout-save-address" className="text-xs text-foreground cursor-pointer">
                  Сохранить этот адрес в личном кабинете для будущих заказов
                </label>
              </div>
            )}
          </div>

          {/* Section 3: Способ доставки */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/60">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold text-sm">
                3
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Способ доставки</h2>
                <p className="text-xs text-muted-foreground">Выберите подходящий вариант получения</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {deliveryMethods.map((method) => {
                const isSelected = selectedDeliveryId === method._id;
                return (
                  <div
                    key={method._id}
                    id={`delivery-method-${method.code}`}
                    onClick={() => setSelectedDeliveryId(method._id)}
                    className={`p-5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-500/5 ring-2 ring-emerald-500/20 shadow-sm"
                        : "border-border hover:border-border/80 bg-background"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Truck className={`h-5 w-5 ${isSelected ? "text-emerald-600" : "text-muted-foreground"}`} />
                        {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                      </div>
                      <h3 className="text-sm font-bold text-foreground leading-snug">{method.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{method.description}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-border/40">
                      <span className="text-sm font-black text-foreground">
                        {method.price === 0 ? "Бесплатно" : formatPrice(method.price)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Способ оплаты */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/60">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 font-bold text-sm">
                4
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Способ оплаты</h2>
                <p className="text-xs text-muted-foreground">Безопасные и удобные методы расчёта</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card Online */}
              <div
                id="payment-method-card"
                onClick={() => setPaymentMethod("card_online")}
                className={`p-5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                  paymentMethod === "card_online"
                    ? "border-emerald-600 bg-emerald-500/5 ring-2 ring-emerald-500/20 shadow-sm"
                    : "border-border hover:border-border/80 bg-background"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <CreditCard className={`h-5 w-5 ${paymentMethod === "card_online" ? "text-emerald-600" : "text-muted-foreground"}`} />
                    {paymentMethod === "card_online" && <Check className="h-4 w-4 text-emerald-600" />}
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Банковской картой онлайн</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    МИР, Visa, Mastercard. Моментальное подтверждение и электронный чек 54-ФЗ.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/40 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>3D-Secure 2.0 защита</span>
                </div>
              </div>

              {/* Cash on delivery */}
              <div
                id="payment-method-cod"
                onClick={() => setPaymentMethod("cod")}
                className={`p-5 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                  paymentMethod === "cod"
                    ? "border-emerald-600 bg-emerald-500/5 ring-2 ring-emerald-500/20 shadow-sm"
                    : "border-border hover:border-border/80 bg-background"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <ShoppingBag className={`h-5 w-5 ${paymentMethod === "cod" ? "text-emerald-600" : "text-muted-foreground"}`} />
                    {paymentMethod === "cod" && <Check className="h-4 w-4 text-emerald-600" />}
                  </div>
                  <h3 className="text-sm font-bold text-foreground">При получении (COD)</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Наличными или картой курьеру / в пункте выдачи после проверки товара.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/40 text-[10px] text-muted-foreground">
                  Без предоплаты
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Комментарий к заказу */}
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="text-sm font-bold text-foreground mb-2">Комментарий к заказу</h2>
            <textarea
              id="checkout-customer-comment"
              rows={3}
              placeholder="Дополнительные пожелания к комплектации, времени звонка или доставке..."
              value={customerComment}
              onChange={(e) => setCustomerComment(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Right Column: Order Summary Sidebar */}
        <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-bold text-foreground pb-4 border-b border-border/60">
              Ваш заказ
            </h2>

            {/* Items List */}
            <div className="mt-4 space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3 text-xs">
                  <div className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-border bg-muted">
                    {item.product.images?.[0]?.url ? (
                      <Image
                        src={item.product.images[0].url}
                        alt={item.product.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-[10px]">
                        Фото
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{item.product.title}</p>
                    <p className="text-muted-foreground mt-0.5">
                      {item.quantity} шт. × {formatPrice(item.product.discountPrice ?? item.product.price)}
                    </p>
                  </div>
                  <div className="text-right font-bold text-foreground">
                    {formatPrice(item.itemTotal)}
                  </div>
                </div>
              ))}
            </div>

            {/* Promo Code Input */}
            <div className="mt-6 pt-5 border-t border-border/60">
              {appliedPromo ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="font-bold text-emerald-700 dark:text-emerald-400">{appliedPromo.code}</p>
                      <p className="text-muted-foreground text-[10px]">
                        Скидка: -{formatPrice(appliedPromo.discountAmount)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    id="checkout-promo-remove"
                    onClick={handleRemovePromo}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Удалить промокод"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <input
                      id="checkout-promo-input"
                      type="text"
                      placeholder="Промокод (напр. KABACHOK10)"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      className="flex-1 h-10 px-3 rounded-xl border border-border bg-background text-xs uppercase placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      id="checkout-promo-apply"
                      disabled={isValidatingPromo || !promoInput.trim()}
                      onClick={handleApplyPromo}
                      className="h-10 px-4 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold disabled:opacity-50 transition-colors flex items-center justify-center"
                    >
                      {isValidatingPromo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Применить"}
                    </button>
                  </div>
                  {promoError && (
                    <p className="mt-2 text-xs text-destructive font-medium">{promoError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Financial Breakdown */}
            <div className="mt-6 pt-5 border-t border-border/60 space-y-2.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Товары ({totalQuantity})</span>
                <span className="font-semibold text-foreground">{formatPrice(totalAmount)}</span>
              </div>

              {appliedPromo && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Скидка по промокоду</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground">
                <span>Доставка</span>
                <span className="font-semibold text-foreground">
                  {deliveryCost === 0 ? "Бесплатно" : formatPrice(deliveryCost)}
                </span>
              </div>

              <div className="pt-3 border-t border-border flex justify-between items-baseline">
                <span className="text-base font-extrabold text-foreground">Итого к оплате</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatPrice(finalAmount)}
                </span>
              </div>
            </div>

            {/* Error banner */}
            {submitError && (
              <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive font-medium flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              id="checkout-submit-button"
              type="submit"
              disabled={isSubmitting}
              className="mt-6 w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Создание заказа...</span>
                </>
              ) : (
                <>
                  <span>Оформить заказ</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Security Guarantee */}
            <div className="mt-4 pt-4 border-t border-border/40 text-center">
              <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Безопасное соединение и гарантия возврата</span>
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
