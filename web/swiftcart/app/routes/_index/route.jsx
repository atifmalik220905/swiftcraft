import { useState } from "react";
import { redirect, Form, useLoaderData, Link } from "react-router";
import { login } from "../../shopify.server";

export const meta = () => {
  return [
    { title: "SwiftCart | The Ultimate Shopify 1-Click Checkout & AOV Platform" },
    { name: "description", content: "Supercharge your Shopify store's conversions. Slide-out cart drawers, KwikPass 1-click logins, pincode EDD checkers, and direct checkout overlays natively integrated." },
  ];
};

export const loader = async ({ request }) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData();

  // --- Cart Drawer Simulator States ---
  const [cartItems, setCartItems] = useState([
    { id: "1", title: "Marula & Argan Oil Shampoo", price: 599, qty: 1, img: "🧴" },
    { id: "2", title: "Korean Rice Water Hair Mask", price: 799, qty: 1, img: "🌸" },
  ]);
  
  const [pincode, setPincode] = useState("");
  const [eddMessage, setEddMessage] = useState("");
  const [isCodBlocked, setIsCodBlocked] = useState(false);
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);

  // KwikPass Login States
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState("upi");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // Lead Modal for Pricing Tiers
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);

  // --- Dynamic Computations ---
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const freeShippingThreshold = 2000;
  const freeGiftThreshold = 3000;

  const updateQty = (id, delta) => {
    setCartItems(prev =>
      prev
        .map(item => (item.id === id ? { ...item, qty: Math.max(0, item.qty + delta) } : item))
        .filter(item => item.qty > 0)
    );
  };

  const handlePincodeCheck = (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      setEddMessage("Please enter a valid 6-digit Pincode.");
      setIsCodBlocked(false);
      return;
    }
    setIsCheckingPincode(true);
    setTimeout(() => {
      setIsCheckingPincode(false);
      // Simulate COD block on specific pincodes (e.g. 110xxx, 400xxx)
      if (pincode.startsWith("110") || pincode.startsWith("400")) {
        setEddMessage("🚚 Expected delivery: 3 days. Prepaid orders only.");
        setIsCodBlocked(true);
      } else {
        setEddMessage("🚚 Expected delivery: 4-5 days. Cash on Delivery (COD) eligible.");
        setIsCodBlocked(false);
      }
    }, 800);
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (phoneNumber.length !== 10) return;
    setIsOtpSent(true);
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (otpCode.length !== 4) return;
    setIsLoggedIn(true);
    setUserProfile({
      name: "Jane Doe",
      phone: phoneNumber,
      address: "12, Green View Residency, SG Highway",
      city: "Ahmedabad",
      state: "Gujarat",
      pincode: pincode || "380015",
    });
  };

  const handlePlaceOrder = () => {
    setIsPlacingOrder(true);
    setTimeout(() => {
      setIsPlacingOrder(false);
      setOrderComplete(true);
      setTimeout(() => {
        // Reset everything
        setCartItems([
          { id: "1", title: "Marula & Argan Oil Shampoo", price: 599, qty: 1, img: "🧴" },
          { id: "2", title: "Korean Rice Water Hair Mask", price: 799, qty: 1, img: "🌸" },
        ]);
        setPincode("");
        setEddMessage("");
        setIsCodBlocked(false);
        setPhoneNumber("");
        setOtpCode("");
        setIsOtpSent(false);
        setIsLoggedIn(false);
        setUserProfile(null);
        setShowCheckoutModal(false);
        setOrderComplete(false);
      }, 3000);
    }, 1500);
  };

  const triggerLeadCheckout = (tierName) => {
    setSelectedTier(tierName);
    setShowLeadModal(true);
  };

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen">
      
      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xl">bolt</span>
              </div>
              <span className="font-headline text-2xl font-extrabold tracking-tight text-primary">SwiftCart</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-on-surface-variant hover:text-primary font-medium transition-colors">Features</a>
              <a href="#simulator" className="text-on-surface-variant hover:text-primary font-medium transition-colors">Cart Simulator</a>
              <a href="#pricing" className="text-on-surface-variant hover:text-primary font-medium transition-colors">Pricing</a>
              <a href="#security" className="text-on-surface-variant hover:text-primary font-medium transition-colors">Security</a>
            </div>

            <div className="flex items-center gap-4">
              <Link to="/login" className="text-primary font-bold hover:opacity-80 transition-opacity">Login</Link>
              <a href="#pricing" className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-bold hover:bg-primary-container transition-all shadow-sm">
                Get Started
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <header className="pt-32 pb-20 bg-gradient-to-b from-surface-container-low to-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined text-sm">flash_on</span>
              <span>Shopify One-Click Checkout Platform</span>
            </div>
            <h1 className="font-headline font-extrabold text-4xl sm:text-5xl lg:text-6xl text-on-background leading-tight">
              Turn Your Store Cart Into a <span className="text-primary">Conversion Machine</span>
            </h1>
            <p className="text-lg text-on-surface-variant leading-relaxed max-w-xl">
              SwiftCart replaces standard cart redirects with a lightning-fast checkout drawer. 
              Reduce drop-offs with KwikPass 1-click logins, pincode EDD calculators, and dynamic upsells natively integrated.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <a href="#pricing" className="bg-primary text-on-primary text-center px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary-container hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/10">
                Start 14-Day Free Trial
              </a>
              <a href="#simulator" className="border-2 border-outline-variant text-center text-primary px-8 py-4 rounded-xl font-bold text-lg hover:bg-surface-container-low transition-all">
                Try Live Simulator
              </a>
            </div>
            <div className="flex items-center gap-6 pt-4 text-sm text-on-surface-variant">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">verified</span>
                <span>Zero Coding Needed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">speed</span>
                <span>Sub-100ms Load Time</span>
              </div>
            </div>
          </div>

          {/* Floating Cart Graphic Preview */}
          <div className="lg:col-span-5 hidden lg:block relative">
            <div className="bg-white border border-outline-variant/30 rounded-3xl p-6 shadow-card hover:shadow-elevated transition-shadow duration-500 relative">
              <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">shopping_bag</span>
                  <span className="font-bold text-lg">Quick Checkout</span>
                </div>
                <div className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded text-[10px] font-bold">FAST CHECKOUT</div>
              </div>
              
              <div className="py-4 space-y-4 text-left">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center text-2xl">🧴</div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">Marula Shampoo</p>
                    <p className="text-xs text-on-surface-variant">Qty: 1</p>
                  </div>
                  <p className="font-bold text-sm">₹599</p>
                </div>
                <div className="p-3 bg-secondary-container/20 rounded-xl border border-secondary/10 flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">flash_on</span>
                  <p className="text-xs text-on-secondary-container font-semibold">KwikPass Active: Welcome back Jane Doe!</p>
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant/30 space-y-3 text-left">
                <div className="flex justify-between text-xs text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>₹599</span>
                </div>
                <button className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">bolt</span> Buy Now (1-Click)
                </button>
              </div>
            </div>
            
            <div className="absolute -top-6 -right-6 bg-primary-container text-on-primary-container p-4 rounded-2xl shadow-lg border border-primary/20 animate-bounce">
              <p className="text-2xl font-black">18%</p>
              <p className="text-[10px] uppercase font-bold tracking-wider opacity-90">AOV Increase</p>
            </div>
          </div>

        </div>
      </header>

      {/* ─── INTERACTIVE CART DRAWER SIMULATOR ─── */}
      <section id="simulator" className="py-24 bg-white border-y border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block mb-3">Live Play Area</span>
            <h2 className="font-headline font-extrabold text-3xl sm:text-4xl text-on-background">
              Try the GoKwik-style Cart Simulator
            </h2>
            <p className="text-on-surface-variant mt-2">
              Interact with the live widget below to experience KwikPass login, Pincode checkers, and the One-Click Checkout modal.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-start">
            
            {/* Control Panel / Instructions */}
            <div className="lg:col-span-5 space-y-6 text-left">
              <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/30 space-y-6">
                <h3 className="font-headline font-bold text-xl text-primary">Interactive Steps</h3>
                
                <ol className="space-y-4 text-sm text-on-surface-variant list-decimal list-inside">
                  <li>
                    <strong className="text-on-background">Gamified Progress Bars:</strong> Change product quantities inside the cart drawer. Watch the bar fill up to unlock <span className="font-semibold text-primary">Free Shipping</span> or <span className="font-semibold text-primary">Free Gift</span>.
                  </li>
                  <li>
                    <strong className="text-on-background">KwikPass 1-Click Login:</strong> Enter a 10-digit mobile number and verify with mock OTP <span className="font-mono text-primary font-bold">1234</span>. It instantly logs you in and pre-populates your details!
                  </li>
                  <li>
                    <strong className="text-on-background">Pincode EDD Checker:</strong> Enter pincode <span className="font-mono text-primary font-bold">110001</span> (New Delhi) to simulate dynamic prepaid-only COD blocks due to high RTO risks.
                  </li>
                  <li>
                    <strong className="text-on-background">1-Click Checkout:</strong> Click the main Checkout button to load our prefilled address modal and complete mock orders instantly.
                  </li>
                </ol>

                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex gap-3">
                  <span className="material-symbols-outlined text-primary">info</span>
                  <p className="text-xs leading-relaxed text-on-primary-fixed-variant">
                    This simulator runs directly in your browser. Real-time updates simulate server calculations from our Remix backend routes.
                  </p>
                </div>
              </div>
            </div>

            {/* Simulated Storefront Cart Drawer */}
            <div className="lg:col-span-7 flex justify-center">
              <div className="w-full max-w-[420px] bg-white border border-outline-variant/50 rounded-3xl shadow-elevated overflow-hidden flex flex-col relative min-h-[640px] transition-all duration-300">
                
                {/* Header */}
                <div className="p-5 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">shopping_bag</span>
                    <span className="font-bold text-primary font-headline">Your Cart ({cartItems.reduce((acc, i) => acc + i.qty, 0)})</span>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">close</span>
                </div>

                {/* Progress Bar Milestones */}
                <div className="p-5 bg-surface-container-lowest border-b border-outline-variant/30 space-y-2">
                  <div className="flex justify-between text-xs font-semibold text-left">
                    {subtotal >= freeGiftThreshold ? (
                      <span className="text-primary flex items-center gap-1">🎉 Free Gift & Shipping Unlocked! 🎁</span>
                    ) : subtotal >= freeShippingThreshold ? (
                      <span className="text-primary flex items-center gap-1">🚚 Free Shipping unlocked! Add ₹{freeGiftThreshold - subtotal} for a Free Gift 🎁</span>
                    ) : (
                      <span className="text-on-surface-variant">Add ₹{freeShippingThreshold - subtotal} for Free Shipping</span>
                    )}
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden relative">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (subtotal / freeGiftThreshold) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* KwikPass 1-Click Login Banner */}
                {!isLoggedIn ? (
                  <div className="mx-5 mt-4 p-4 bg-secondary-container/20 rounded-2xl border border-secondary/15 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-secondary-container flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>flash_on</span>
                        KwikPass 1-Click Login
                      </span>
                      <span className="text-[10px] text-secondary font-black bg-white px-2 py-0.5 rounded border border-secondary/15">SAVE TIME</span>
                    </div>

                    {!isOtpSent ? (
                      <form onSubmit={handleSendOtp} className="flex gap-2">
                        <input 
                          type="tel" 
                          placeholder="Enter 10-digit mobile number" 
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          className="bg-white border border-outline rounded-lg px-3 py-1.5 text-xs flex-1 focus:ring-1 focus:ring-primary outline-none"
                          required
                        />
                        <button type="submit" className="bg-primary text-on-primary text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                          Get OTP
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="Enter mock OTP '1234'" 
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          className="bg-white border border-outline rounded-lg px-3 py-1.5 text-xs flex-1 focus:ring-1 focus:ring-primary outline-none"
                          required
                        />
                        <button type="submit" className="bg-secondary text-on-secondary text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all">
                          Verify
                        </button>
                      </form>
                    )}
                  </div>
                ) : (
                  <div className="mx-5 mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-success text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <div className="text-left">
                        <p className="text-xs font-bold text-primary">KwikPass Active</p>
                        <p className="text-[10px] text-on-surface-variant">Logged in as {userProfile.name}</p>
                      </div>
                    </div>
                    <button onClick={() => setIsLoggedIn(false)} className="text-[10px] text-error font-bold hover:underline">Logout</button>
                  </div>
                )}

                {/* Items List */}
                <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[220px]">
                  {cartItems.length === 0 ? (
                    <div className="text-center py-10 text-on-surface-variant text-sm">Your cart is empty.</div>
                  ) : (
                    cartItems.map((item) => (
                      <div key={item.id} className="flex gap-4 items-center border-b border-outline-variant/20 pb-3">
                        <div className="w-12 h-12 bg-surface-container-low rounded-xl flex items-center justify-center text-2xl shrink-0">
                          {item.img}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-bold text-sm truncate">{item.title}</p>
                          <p className="text-xs text-primary font-semibold">₹{item.price}</p>
                        </div>
                        <div className="flex items-center gap-2 border border-outline-variant rounded-lg p-1">
                          <button onClick={() => updateQty(item.id, -1)} className="px-2 text-xs font-bold hover:bg-surface-container">-</button>
                          <span className="text-xs font-semibold">{item.qty}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="px-2 text-xs font-bold hover:bg-surface-container">+</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Pincode & Serviceability Checker */}
                <div className="mx-5 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/30 space-y-3 text-left">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                    <span className="text-xs font-bold">Check Delivery & COD Availability</span>
                  </div>
                  <form onSubmit={handlePincodeCheck} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Enter 6-digit Pincode"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="bg-white border border-outline rounded-lg px-3 py-1.5 text-xs flex-1 outline-none"
                    />
                    <button type="submit" className="bg-primary text-on-primary text-xs font-bold px-3 py-1.5 rounded-lg">
                      {isCheckingPincode ? "Checking..." : "Check"}
                    </button>
                  </form>
                  {eddMessage && (
                    <p className={`text-[11px] font-semibold text-left ${isCodBlocked ? "text-error" : "text-primary"}`}>
                      {eddMessage}
                    </p>
                  )}
                </div>

                {/* Footer Subtotal & Checkout CTA */}
                <div className="p-5 border-t border-outline-variant/30 bg-surface-container-low mt-auto">
                  <div className="flex justify-between items-center mb-4 text-sm">
                    <span className="text-on-surface-variant font-medium">Subtotal</span>
                    <span className="font-extrabold text-base text-primary">₹{subtotal}</span>
                  </div>
                  <button 
                    onClick={() => {
                      if (cartItems.length > 0) setShowCheckoutModal(true);
                    }}
                    disabled={cartItems.length === 0}
                    className="w-full bg-primary text-on-primary py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-container active:scale-95 transition-all shadow-md shadow-primary/10"
                  >
                    <span className="material-symbols-outlined text-sm">shopping_cart_checkout</span>
                    <span>Proceed to 1-Click Checkout</span>
                  </button>
                </div>

                {/* ─── 1-CLICK CHECKOUT MODAL OVERLAY ─── */}
                {showCheckoutModal && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4">
                    <div className="w-full bg-white rounded-3xl shadow-2xl p-5 border border-outline-variant/40 animate-slide-up space-y-4 max-h-[580px] overflow-y-auto">
                      
                      <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                        <span className="font-headline font-extrabold text-lg text-primary flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                          Swift Checkout
                        </span>
                        <button onClick={() => setShowCheckoutModal(false)} className="material-symbols-outlined text-on-surface-variant hover:text-error">close</button>
                      </div>

                      {orderComplete ? (
                        <div className="py-16 text-center space-y-4">
                          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary border border-primary/20">
                            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          </div>
                          <h4 className="font-headline font-black text-xl text-primary">Order Placed Successfully!</h4>
                          <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                            Thank you for your purchase. We are redirecting you to your store page.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 text-left">
                          
                          {/* Shipping Details form */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Shipping Details</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <input 
                                type="text" 
                                placeholder="Full Name" 
                                defaultValue={isLoggedIn ? userProfile.name : ""} 
                                className="bg-surface-container border border-outline-variant rounded-lg p-2 text-xs outline-none"
                              />
                              <input 
                                type="tel" 
                                placeholder="Phone Number" 
                                defaultValue={isLoggedIn ? userProfile.phone : ""} 
                                className="bg-surface-container border border-outline-variant rounded-lg p-2 text-xs outline-none"
                              />
                            </div>
                            <input 
                              type="text" 
                              placeholder="Address Line 1" 
                              defaultValue={isLoggedIn ? userProfile.address : ""} 
                              className="w-full bg-surface-container border border-outline-variant rounded-lg p-2 text-xs outline-none"
                            />
                            <div className="grid grid-cols-3 gap-2">
                              <input 
                                type="text" 
                                placeholder="City" 
                                defaultValue={isLoggedIn ? userProfile.city : ""} 
                                className="bg-surface-container border border-outline-variant rounded-lg p-2 text-xs outline-none"
                              />
                              <input 
                                type="text" 
                                placeholder="State" 
                                defaultValue={isLoggedIn ? userProfile.state : ""} 
                                className="bg-surface-container border border-outline-variant rounded-lg p-2 text-xs outline-none"
                              />
                              <input 
                                type="text" 
                                placeholder="Pincode" 
                                defaultValue={isLoggedIn ? userProfile.pincode : pincode} 
                                className="bg-surface-container border border-outline-variant rounded-lg p-2 text-xs outline-none"
                              />
                            </div>
                          </div>

                          {/* Payment Selector */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Payment Method</h4>
                            <div className="grid grid-cols-3 gap-2">
                              
                              <div 
                                onClick={() => setSelectedPayment("upi")}
                                className={`p-2.5 rounded-xl border-2 text-center cursor-pointer transition-all ${
                                  selectedPayment === "upi" ? "border-primary bg-primary/5" : "border-outline-variant bg-surface"
                                }`}
                              >
                                <span className="block text-xs font-bold text-on-surface">UPI / Apps</span>
                                <span className="text-[9px] text-on-surface-variant">Instant</span>
                              </div>

                              <div 
                                onClick={() => setSelectedPayment("card")}
                                className={`p-2.5 rounded-xl border-2 text-center cursor-pointer transition-all ${
                                  selectedPayment === "card" ? "border-primary bg-primary/5" : "border-outline-variant bg-surface"
                                }`}
                              >
                                <span className="block text-xs font-bold text-on-surface">Card</span>
                                <span className="text-[9px] text-on-surface-variant">Visa/Master</span>
                              </div>

                              <button 
                                disabled={isCodBlocked}
                                onClick={() => setSelectedPayment("cod")}
                                className={`p-2.5 rounded-xl border-2 text-center w-full transition-all ${
                                  isCodBlocked ? "opacity-50 cursor-not-allowed bg-surface-container border-dashed" : "cursor-pointer"
                                } ${
                                  selectedPayment === "cod" ? "border-primary bg-primary/5" : "border-outline-variant bg-surface"
                                }`}
                              >
                                <span className="block text-xs font-bold text-on-surface">COD</span>
                                <span className="text-[9px] text-on-surface-variant">
                                  {isCodBlocked ? "Blocked" : "Pay on delivery"}
                                </span>
                              </button>

                            </div>
                          </div>

                          {/* Submit Action */}
                          <button 
                            onClick={handlePlaceOrder}
                            disabled={isPlacingOrder}
                            className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
                          >
                            <span className="material-symbols-outlined text-sm">lock</span>
                            <span>{isPlacingOrder ? "Placing Order..." : `Pay & Complete Order (₹${subtotal})`}</span>
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section id="features" className="py-24 bg-surface-container-low border-b border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block mb-3">Packed with Power</span>
            <h2 className="font-headline font-extrabold text-3xl sm:text-4xl text-on-background">
              Everything you need to increase cart values
            </h2>
            <p className="text-lg text-on-surface-variant mt-2">
              SwiftCart unifies multiple conversion utilities into a single, light storefront extension.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
            
            <div className="bg-white p-8 rounded-3xl border border-outline-variant/30 hover:border-primary/20 transition-all hover:shadow-card">
              <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6">
                <span className="material-symbols-outlined text-2xl">side_navigation</span>
              </div>
              <h3 className="font-headline font-extrabold text-lg text-primary mb-2">Slide Cart Drawer</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Tactile sidebar drawer rendering in under 100ms. Keep buyers focused on products instead of checkout redirections.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-outline-variant/30 hover:border-primary/20 transition-all hover:shadow-card">
              <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6">
                <span className="material-symbols-outlined text-2xl">rebase_edit</span>
              </div>
              <h3 className="font-headline font-extrabold text-lg text-primary mb-2">Milestone Rewards</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Add progressive free-shipping, discounts, and auto-injected free gifts. Nudge shoppers to spend more.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-outline-variant/30 hover:border-primary/20 transition-all hover:shadow-card">
              <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6">
                <span className="material-symbols-outlined text-2xl">flash_on</span>
              </div>
              <h3 className="font-headline font-extrabold text-lg text-primary mb-2">KwikPass 1-Click Login</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Autofill customer profiles using quick phone OTP verifications. Skip manual typing on mobile keypads.
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-outline-variant/30 hover:border-primary/20 transition-all hover:shadow-card">
              <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6">
                <span className="material-symbols-outlined text-2xl">gavel</span>
              </div>
              <h3 className="font-headline font-extrabold text-lg text-primary mb-2">COD & RTO Protection</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Verify cash-on-delivery orders automatically with OTP limits. Block non-serviceable pincodes from checkout.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ─── SECURITY SECTION ─── */}
      <section id="security" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-6 text-left">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block">Enterprise Security</span>
            <h2 className="font-headline font-extrabold text-3xl sm:text-4xl text-on-background">
              PCI DSS Level 1 Security. Trusted Residency.
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              We encrypt transaction and customer details using AES-256 standard protocols. 
              Our databases are hosted on AWS Mumbai to comply with RBI data residency laws.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">cloud_done</span>
                <span className="font-semibold text-sm">Exclusively Hosted on AWS Mumbai (ap-south-1)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">verified_user</span>
                <span className="font-semibold text-sm">GDPR & CCPA Compliant Privacy Measures</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low p-8 rounded-3xl border border-outline-variant/30 space-y-4 text-left">
            <h3 className="font-bold text-lg text-primary mb-4">Uptime Report</h3>
            <div className="flex justify-between items-center text-sm border-b border-outline-variant/30 pb-3">
              <span>SLA Target</span>
              <span className="font-bold">99.9%</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-outline-variant/30 pb-3">
              <span>Average API Latency</span>
              <span className="font-bold text-primary">&lt; 50ms</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Status</span>
              <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-xs font-bold">ALL SYSTEMS GO</span>
            </div>
          </div>

        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="py-24 bg-surface-container-low border-t border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block mb-3">Transparent Pricing</span>
            <h2 className="font-headline font-extrabold text-3xl sm:text-4xl text-on-background">
              Flexible Plans for Growing Brands
            </h2>
            <p className="text-on-surface-variant mt-2">
              Start with our 14-day free trial. Install directly into your shop to activate configurations.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Starter Plan */}
            <div className="bg-white p-8 rounded-3xl border border-outline-variant/30 hover:border-primary/20 transition-all flex flex-col justify-between shadow-sm">
              <div className="text-left">
                <h3 className="font-headline font-black text-xl text-on-background">Starter</h3>
                <p className="text-xs text-on-surface-variant mt-1">Best for newer stores starting to scale.</p>
                <p className="text-3xl font-black text-primary mt-6">₹999<span className="text-xs text-on-surface-variant font-medium">/month</span></p>
                
                <ul className="space-y-3 text-xs text-on-surface-variant pt-6 border-t border-outline-variant/30 mt-6">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span>Custom Cart Drawer UI</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span>1 Active Milestone Progress Bar</span>
                  </li>
                  <li className="flex items-center gap-2 opacity-50">
                    <span className="material-symbols-outlined text-sm">block</span>
                    <span>KwikPass 1-Click Login</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => triggerLeadCheckout("Starter")}
                className="w-full bg-primary/5 text-primary py-3 rounded-xl font-bold mt-8 hover:bg-primary hover:text-on-primary transition-all text-sm"
              >
                Install on Shopify
              </button>
            </div>

            {/* Growth Plan */}
            <div className="bg-white p-8 rounded-3xl border-2 border-primary relative flex flex-col justify-between shadow-md">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                Most Popular
              </div>
              <div className="text-left">
                <h3 className="font-headline font-black text-xl text-on-background">Growth</h3>
                <p className="text-xs text-on-surface-variant mt-1">For growing D2C brands scaling order values.</p>
                <p className="text-3xl font-black text-primary mt-6">₹2,499<span className="text-xs text-on-surface-variant font-medium">/month</span></p>
                
                <ul className="space-y-3 text-xs text-on-surface-variant pt-6 border-t border-outline-variant/30 mt-6">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span>Unlimited Milestone Progress Bars</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span>KwikPass 1-Click Login</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span>Pincode Delivery Speed Calculator</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => triggerLeadCheckout("Growth")}
                className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold mt-8 hover:bg-primary-container transition-all text-sm shadow-md"
              >
                Install on Shopify
              </button>
            </div>

            {/* Scale Plan */}
            <div className="bg-white p-8 rounded-3xl border border-outline-variant/30 hover:border-primary/20 transition-all flex flex-col justify-between shadow-sm">
              <div className="text-left">
                <h3 className="font-headline font-black text-xl text-on-background">Scale</h3>
                <p className="text-xs text-on-surface-variant mt-1">For established high-volume retailers.</p>
                <p className="text-3xl font-black text-primary mt-6">₹4,999<span className="text-xs text-on-surface-variant font-medium">/month</span></p>
                
                <ul className="space-y-3 text-xs text-on-surface-variant pt-6 border-t border-outline-variant/30 mt-6">
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span>All Growth features included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span>COD RTO Protection & OTP verification</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                    <span>Dedicated Solution Engineer Support</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => triggerLeadCheckout("Scale")}
                className="w-full bg-primary/5 text-primary py-3 rounded-xl font-bold mt-8 hover:bg-primary hover:text-on-primary transition-all text-sm"
              >
                Install on Shopify
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* ─── LEAD COLLECTION & SHOPIFY INSTALL MODAL ─── */}
      {showLeadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 border border-outline-variant/30 max-w-sm w-full relative">
            <button 
              onClick={() => setShowLeadModal(false)}
              className="absolute top-4 right-4 material-symbols-outlined text-on-surface-variant hover:text-error"
            >
              close
            </button>
            
            <div className="text-center space-y-4">
              <span className="text-primary font-bold text-xs uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full">
                Activate {selectedTier} Tier
              </span>
              <h3 className="font-headline font-extrabold text-xl">Install SwiftCart App</h3>
              <p className="text-xs text-on-surface-variant">
                Enter your Shopify store domain to connect to Supabase and begin your 14-day free trial.
              </p>
            </div>

            {showForm && (
              <Form className="space-y-4 mt-6" method="post" action="/auth/login">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase text-on-surface-variant">Shopify Domain</label>
                  <input 
                    type="text" 
                    name="shop"
                    placeholder="your-brand.myshopify.com"
                    className="w-full bg-surface-container border border-outline-variant rounded-lg p-3 text-xs outline-none"
                    required
                  />
                  <p className="text-[9px] text-on-surface-variant mt-0.5">e.g: my-shop-domain.myshopify.com</p>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-transform"
                >
                  Install & Start Trial
                </button>
              </Form>
            )}
          </div>
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <footer className="bg-slate-950 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">bolt</span>
            </div>
            <span className="font-headline text-xl font-extrabold text-white">SwiftCart</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 text-sm">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#simulator" className="hover:text-white transition-colors">Cart Simulator</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
          </div>

          <p className="text-xs text-slate-500">© 2026 SwiftCart. Powered by Vercel + Supabase.</p>
        </div>
      </footer>

    </div>
  );
}
