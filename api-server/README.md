# 🐒 MonkeyTraders - API 서버

최신 기술 스택으로 구축된 **고성능 실시간 금융 데이터 API 서버**입니다.  
이 프로젝트는 MonkeyTraders 플랫폼의 백엔드 시스템으로,  
복잡한 금융 데이터를 안정적으로 수집·처리하고 **클라이언트에게 실시간 제공**하는 것을 목표로 합니다.

NestJS의 강력한 **모듈 시스템**과 **클린 아키텍처 원칙**을 기반으로 설계되어,  
여러 외부 금융 API를 **유연하게 통합**하고 **확장 가능한 구조**를 갖추고 있습니다.

---

## 🚀 주요 기능 (Key Features)

- 📈 **실시간 데이터 스트리밍**  
  WebSocket을 통해 클라이언트와 양방향 통신 채널을 구축하고,  
  주식 및 암호화폐의 **시세·체결 내역 등 실시간 데이터**를 스트리밍합니다.

- 🏛️ **다중 데이터 소스 통합**  
  Alpaca(주식), Upbit(암호화폐) 등 여러 외부 금융 API를 동시에 지원합니다.  
  **Provider 추상화 패턴**을 적용하여 새로운 데이터 소스를 최소한의 코드로 손쉽게 추가할 수 있습니다.

- 🔐 **JWT 기반 인증 시스템**  
  Passport.js와 JWT(JSON Web Token)를 사용하여 **안전하고 Stateless한 인증·인가 시스템**을 구현했습니다.

- ⚡ **고성능 캐싱 전략**  
  Redis 기반의 전역 캐시 레이어를 구축하여 **API 요청 부하를 최소화**하고,  
  **응답 속도를 극대화**했습니다.

- 🔩 **강력한 유효성 검사**  
  DTO(Data Transfer Object)와 `class-validator`를 활용하여  
  모든 요청의 입력값을 명확하게 정의하고, **자동 유효성 검증**을 수행합니다.

- 🗃️ **Prisma 기반 데이터베이스 관리**  
  Prisma ORM을 통해 **타입 안전(type-safe)**한 데이터 모델 관리 및 자동 마이그레이션을 지원합니다.

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분              | 기술                               |
| ----------------- | ---------------------------------- |
| **Core**          | NestJS, TypeScript, RxJS           |
| **실시간 통신**   | WebSocket (Socket.IO)              |
| **데이터베이스**  | Prisma, PostgreSQL                 |
| **인증**          | Passport.js, JWT                   |
| **캐싱**          | Redis, Cache-Manager               |
| **외부 API 연동** | Axios, Alpaca Trade API, Upbit API |
| **개발 도구**     | ESLint, Prettier, Jest             |

---

## 🏛️ 아키텍처 및 기술적 결정 (Architectural Highlights)

MonkeyTraders API 서버는 단순한 데이터 제공을 넘어,  
**확장성, 유연성, 유지보수성**을 극대화하기 위해 설계되었습니다.

### 1️⃣ 클린 아키텍처 & 모듈러 디자인

**목적:**  
계층 간 의존성을 명확히 하고, 비즈니스 로직을 외부 환경(프레임워크, DB 등)으로부터 보호하기 위함입니다.

**구조:**

- `financial`: 금융 데이터 처리의 핵심 비즈니스 로직
- `gateway`: WebSocket 기반 실시간 통신
- `database`: Prisma를 통한 데이터 영속성 관리
- `auth`, `user`: 사용자 인증 및 정보 관리

각 모듈은 **명확한 책임(Separation of Concerns)** 을 가지며,  
NestJS의 **의존성 주입(DI)** 을 통해 유연하게 상호작용합니다.

---

### 2️⃣ 금융 데이터 프로바이더 추상화 (Provider Abstraction)

**문제점:**  
Alpaca, Upbit 등 서로 다른 명세(specification)를 가진 외부 API를 직접 사용하면  
비즈니스 로직이 특정 API에 종속되는 문제가 발생합니다.

**해결책:**  
`ProviderRegistry`와 `FinancialProvider` 인터페이스를 도입하여 **어댑터 패턴(Adapter Pattern)** 을 구현했습니다.

- `FinancialProvider` 인터페이스는 `getAssets`, `getCandles` 등 **표준 메서드**를 정의
- `AlpacaStockProvider`, `UpbitCryptoProvider` 등은 이를 구현하여  
  각 API의 요청·응답 형식을 내부 표준에 맞게 **변환(Translation)**

→ 이를 통해 상위 서비스(`FinancialService`)는  
API 종류를 몰라도 **일관된 방식으로 데이터 요청 가능**

💡 새로운 API(예: Binance) 추가 시, 최소한의 코드 변경으로 손쉽게 확장 가능

---

### 3️⃣ 실시간 구독 관리 및 데이터 스트리밍

**구조:**  
`MarketGateway`는 클라이언트의 **구독(subscribe)** 및 **해제(unsubscribe)** 요청을 처리합니다.

**오케스트레이션:**  
`MarketSubscriptionService`가 “지휘자” 역할을 하여

- 어떤 클라이언트가 어떤 채널(`AAPL`, `HotStocks` 등)을 구독 중인지 관리
- 프로바이더에서 들어온 실시간 데이터를 해당 구독자에게만 정확히 전달 (브로드캐스팅)

**RxJS 활용:**  
프로바이더로부터 들어오는 데이터 스트림을 **Observable**로 처리하여

- 데이터 병합(`merge`)
- 필터링(`filter`)
- 비동기 스트림 관리

을 선언적이고 효율적으로 수행합니다.

---

## 📚 요약

> MonkeyTraders API 서버는 **NestJS + TypeScript + Prisma + Redis + WebSocket** 기반의  
> 실시간 금융 데이터 백엔드로,  
> 클린 아키텍처와 어댑터 패턴을 통해 **유연한 데이터 통합과 고성능 스트리밍**을 구현했습니다.
