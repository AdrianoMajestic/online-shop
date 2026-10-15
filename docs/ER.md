# Диаграмма сущностей базы данных (ER.md)

Диаграмма моделей данных MongoDB / Mongoose для интернет-магазина «Кабачок».

> Согласно архитектурному решению **D-001** (см. `docs/DECISIONS.md`), в проекте применяется гибридный подход: независимые сущности (каталог, пользователи, справочники) связываются по `ObjectId`, а финансовые и контактные данные в заказе фиксируются в виде неизменяемых снимков (embedded documents).

```mermaid
erDiagram
    User ||--o{ Address : "has many"
    User ||--o| Cart : "owns"
    User ||--o{ Order : "places"
    User ||--o{ Review : "writes"
    User ||--o{ AuditLog : "initiates"

    Category ||--o{ Category : "parent/children"
    Category ||--o{ Product : "contains"
    Brand ||--o{ Product : "manufactures"

    Product ||--o{ Review : "receives"
    
    Order ||--o{ Payment : "has"

    User {
        ObjectId _id PK
        string email UK
        string name
        string role "customer | manager | admin"
        string phone
        ObjectId_array assignedCategoryIds "for manager"
        object consents "personalData, marketing"
        boolean emailVerified
        date bannedUntil "admin plugin ban"
        date deletedAt
        date createdAt
        date updatedAt
    }

    Category {
        ObjectId _id PK
        ObjectId parentId FK "nullable"
        string title
        string slug UK
        string description
        boolean isVisible
        number sortOrder
        date createdAt
        date updatedAt
    }

    Brand {
        ObjectId _id PK
        string title
        string slug UK
        string logoUrl
        string description
        date createdAt
        date updatedAt
    }

    Product {
        ObjectId _id PK
        ObjectId categoryId FK
        ObjectId brandId FK
        string sku UK
        string title
        string slug UK
        string description
        number price "in kopecks"
        number discountPrice "in kopecks, nullable"
        number stockQuantity
        boolean isPublished
        object_array images "url, alt"
        object_array attributes "key, value"
        number ratingAvg
        number reviewsCount
        number salesCount
        date deletedAt
        date createdAt
        date updatedAt
    }

    Address {
        ObjectId _id PK
        ObjectId userId FK
        string city
        string street
        string house
        string apartment
        string postalCode
        string comment
        date createdAt
        date updatedAt
    }

    DeliveryMethod {
        ObjectId _id PK
        string code UK
        string title
        number price "in kopecks"
        string description
        boolean isActive
        date createdAt
        date updatedAt
    }

    PromoCode {
        ObjectId _id PK
        string code UK "uppercase"
        string discountType "percentage | fixed"
        number discountValue
        number minOrderAmount "in kopecks"
        date validFrom
        date validTo
        number usageLimit
        number usedCount
        boolean isActive
        date createdAt
        date updatedAt
    }

    Cart {
        ObjectId _id PK
        ObjectId userId UK FK
        object_array items "productId, quantity"
        date createdAt
        date updatedAt
    }

    Order {
        ObjectId _id PK
        string number UK "human-readable"
        ObjectId userId FK "nullable for guests"
        object contact "fullName, phone, email"
        object shippingAddress "city, street, house, apt, postalCode, comment"
        object delivery "methodId, title, price"
        object_array items "productId, sku, title, quantity, pricePerUnit, totalPrice"
        object promo "promoCodeId, code, discountAmount"
        number totalAmount "in kopecks"
        number discountAmount "in kopecks"
        number deliveryCost "in kopecks"
        number finalAmount "in kopecks"
        string status "new | paid | processing | shipped | completed | cancelled"
        string paymentMethod "card_online | cod"
        string customerComment
        object_array managerComments "authorId, text, at"
        object_array statusHistory "from, to, byUserId, at"
        date deletedAt
        date createdAt
        date updatedAt
    }

    Payment {
        ObjectId _id PK
        ObjectId orderId FK
        string provider "mock"
        string externalPaymentId UK
        string method "card_online | cod"
        string status "pending | succeeded | failed | refunded"
        number amount "in kopecks"
        date paidAt
        date createdAt
        date updatedAt
    }

    Review {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId productId FK
        number rating "1 to 5"
        string comment
        boolean isApproved
        object managerReply "authorId, text, at"
        date createdAt
        date updatedAt
    }

    AuditLog {
        ObjectId _id PK
        ObjectId userId FK "nullable"
        string action
        string entity
        string entityId
        object meta
        string ip
        date at
    }
```
