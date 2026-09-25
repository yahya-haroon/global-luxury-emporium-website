import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { isSupabaseConfigured, uploadProductImage } from '../lib/supabase';
import { compressImage } from '../lib/imageCompressor';
import { Product, ProductOption, ProductOptionType, Settings, Review, OrderStatus } from '../types';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Search,
  RefreshCw,
  Star,
  BadgeCheck,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  useEffect(() => {
    let metaTag = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const created = !metaTag;
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'robots';
      document.head.appendChild(metaTag);
    }
    const prevContent = metaTag.content;
    metaTag.content = 'noindex, nofollow';

    return () => {
      if (created && metaTag && metaTag.parentNode) {
        metaTag.parentNode.removeChild(metaTag);
      } else if (metaTag) {
        metaTag.content = prevContent;
      }
    };
  }, []);
  const {
    user,
    loading: authLoading,
    login,
    logout,
    resetPassword,
    updatePassword,
    isPasswordRecovery,
    setIsPasswordRecovery,
  } = useAuth();

  const {
    products,
    settings,
    orders,
    reviews,
    featuredImages,
    loading: dataLoading,
    saveProduct,
    deleteProduct,
    toggleProductVisibility,
    saveSettings,
    refreshOrders,
    refreshReviews,
    refreshFeaturedImages,
    updateOrderStatus,
    saveReviewEdits,
    deleteReview,
    addFeaturedImage,
    updateFeaturedImage,
    deleteFeaturedImage,
    reorderFeaturedImages,
  } = useData();

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'reviews' | 'gallery' | 'settings'>('products');

  // Orders tab state
  const [orderFilter, setOrderFilter] = useState<'all' | OrderStatus>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Reviews tab state
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editReviewRating, setEditReviewRating] = useState(5);
  const [editReviewText, setEditReviewText] = useState('');
  const [reviewActionBusy, setReviewActionBusy] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'all' | 'published' | 'hidden'>('all');

  // Featured gallery tab state
  const [isUploadingFeatured, setIsUploadingFeatured] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccessMessage, setLoginSuccessMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Password Recovery state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Product Form Modal state
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    category: 'Women',
    description: '',
    sizes: 'XS, S, M, L, XL',
    options: [],
    images: [],
    allow_personalisation: false,
    allow_requirements: false,
    is_visible: true,
    sort_order: 1,
  });
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Settings Form state
  const [settingsForm, setSettingsForm] = useState<Settings>(settings);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleRefreshOrders = async () => {
    setIsRefreshingOrders(true);
    try {
      await refreshOrders();
    } finally {
      setIsRefreshingOrders(false);
    }
  };

  // Change an order's delivery status (owner only; enforced by RLS).
  const handleOrderStatusChange = async (orderId: string, status: OrderStatus) => {
    setUpdatingOrderId(orderId);
    const result = await updateOrderStatus(orderId, status);
    setUpdatingOrderId(null);
    if (result.error) {
      alert(`Could not update order status: ${result.error}`);
    }
  };

  const productNameById = (productId: string): string => {
    return products.find((p) => p.id === productId)?.name || 'Unknown product';
  };

  const startEditReview = (review: Review) => {
    setEditingReviewId(review.id);
    setEditReviewRating(review.rating);
    setEditReviewText(review.review);
  };

  const handleSaveReviewEdits = async (reviewId: string) => {
    setReviewActionBusy(reviewId);
    const result = await saveReviewEdits(reviewId, {
      rating: editReviewRating,
      review: editReviewText.trim(),
    });
    setReviewActionBusy(null);
    if (result.error) {
      alert(`Could not save review: ${result.error}`);
    } else {
      setEditingReviewId(null);
    }
  };

  const handleToggleReviewPublished = async (review: Review) => {
    setReviewActionBusy(review.id);
    const result = await saveReviewEdits(review.id, { published: !review.published });
    setReviewActionBusy(null);
    if (result.error) {
      alert(`Could not update review visibility: ${result.error}`);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Delete this review permanently?')) return;
    setReviewActionBusy(reviewId);
    const result = await deleteReview(reviewId);
    setReviewActionBusy(null);
    if (result.error) {
      alert(`Could not delete review: ${result.error}`);
    }
  };

  // Featured gallery: upload a new image into the product-images bucket,
  // then register it as a featured image.
  const handleFeaturedFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploadingFeatured(true);
    setGalleryError(null);

    try {
      for (const file of files) {
        const compressedBlob = await compressImage(file, 1600, 0.82);

        if (isSupabaseConfigured) {
          const publicUrl = await uploadProductImage(compressedBlob, file.name);
          const result = await addFeaturedImage({ image_url: publicUrl, alt_text: '' });
          if (result.error) throw new Error(result.error);
        } else {
          const dataUrl = await new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.readAsDataURL(compressedBlob);
          });
          const result = await addFeaturedImage({ image_url: dataUrl, alt_text: '' });
          if (result.error) throw new Error(result.error);
        }
      }
    } catch (err: any) {
      console.error('Featured image upload failed:', err);
      setGalleryError(err.message || 'Failed to upload featured image.');
    } finally {
      setIsUploadingFeatured(false);
      if (e.target) e.target.value = '';
    }
  };

  // Quick-add an existing product image to the featured gallery.
  const handleAddProductImageToGallery = async (imageUrl: string) => {
    setGalleryError(null);
    const result = await addFeaturedImage({ image_url: imageUrl, alt_text: '' });
    if (result.error) {
      setGalleryError(result.error);
    }
  };

  const handleMoveFeatured = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= featuredImages.length) return;
    const ordered = [...featuredImages];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(targetIndex, 0, moved);
    await reorderFeaturedImages(ordered.map((f) => f.id));
  };

  const addDeliveryZone = () => {
    const newZone = {
      id: `zone_${Date.now()}`,
      name: '',
      price: 0,
    };
    setSettingsForm((prev) => ({
      ...prev,
      delivery_zones: [...(prev.delivery_zones || []), newZone],
    }));
  };

  const updateDeliveryZone = (index: number, updates: Partial<{ name: string; price: number }>) => {
    setSettingsForm((prev) => ({
      ...prev,
      delivery_zones: (prev.delivery_zones || []).map((zone, i) =>
        i === index ? { ...zone, ...updates } : zone
      ),
    }));
  };

  const removeDeliveryZone = (index: number) => {
    setSettingsForm((prev) => ({
      ...prev,
      delivery_zones: (prev.delivery_zones || []).filter((_, i) => i !== index),
    }));
  };

  // Sync settings when loaded
  React.useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSuccessMessage(null);
    setIsLoggingIn(true);

    const result = await login(loginEmail, loginPassword);
    setIsLoggingIn(false);

    if (result.error) {
      setLoginError(result.error);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async () => {
    if (!loginEmail.trim()) {
      setLoginError('Please enter your owner email address first.');
      return;
    }
    setLoginError(null);
    setLoginSuccessMessage(null);

    const result = await resetPassword(loginEmail);
    if (result.error) {
      setLoginError(result.error);
    } else {
      setLoginSuccessMessage('Password reset email has been sent. Check your inbox.');
    }
  };

  // Handle Set New Password (Requirement 1)
  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (newPassword.length < 8) {
      setRecoveryError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setRecoveryError('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    const result = await updatePassword(newPassword);
    setIsUpdatingPassword(false);

    if (result.error) {
      setRecoveryError(result.error);
    } else {
      setRecoverySuccess(true);
      setTimeout(() => {
        setIsPasswordRecovery(false);
        setRecoverySuccess(false);
      }, 2000);
    }
  };

  // Handle Multi-image selection & client compression
  const handleImageFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentImages = currentProduct.images || [];
    const availableSlots = 8 - currentImages.length;
    if (availableSlots <= 0) {
      setProductFormError('Maximum 8 photos allowed per product.');
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    setIsUploadingImages(true);
    setProductFormError(null);

    try {
      const uploadedUrls: string[] = [];

      for (const file of filesToProcess) {
        // Compress client-side to max 1200px at ~0.82 quality
        const compressedBlob = await compressImage(file, 1200, 0.82);

        if (isSupabaseConfigured) {
          // Upload directly to Supabase Storage 'product-images'
          const publicUrl = await uploadProductImage(compressedBlob, file.name);
          uploadedUrls.push(publicUrl);
        } else {
          // In offline/demo mode, use a local data URL
          const dataUrl = await new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.readAsDataURL(compressedBlob);
          });
          uploadedUrls.push(dataUrl);
        }
      }

      setCurrentProduct((prev) => ({
        ...prev,
        images: [...(prev.images || []), ...uploadedUrls],
      }));
    } catch (err: any) {
      console.error('Image compression/upload failed:', err);
      setProductFormError(`Failed to process images: ${err.message}`);
    } finally {
      setIsUploadingImages(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleMakeMainImage = (index: number) => {
    const imgs = [...(currentProduct.images || [])];
    const [selected] = imgs.splice(index, 1);
    imgs.unshift(selected);
    setCurrentProduct((prev) => ({ ...prev, images: imgs }));
  };

  const handleRemoveImage = (index: number) => {
    const imgs = [...(currentProduct.images || [])];
    imgs.splice(index, 1);
    setCurrentProduct((prev) => ({ ...prev, images: imgs }));
  };

  // Product Options
  const productOptions = currentProduct.options || [];

  const addProductOption = () => {
    const newOption: ProductOption = {
      name: `Option ${productOptions.length + 1}`,
      type: 'select',
      required: true,
      values: [''],
      label: '',
      placeholder: '',
    };

    setCurrentProduct((prev) => ({
      ...prev,
      options: [...(prev.options || []), newOption],
    }));
  };

  const updateProductOption = (index: number, updates: Partial<ProductOption>) => {
    setCurrentProduct((prev) => ({
      ...prev,
      options: (prev.options || []).map((option, i) =>
        i === index ? { ...option, ...updates } : option
      ),
    }));
  };

  const removeProductOption = (index: number) => {
    setCurrentProduct((prev) => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== index),
    }));
  };

  const addOptionValue = (optionIndex: number) => {
    setCurrentProduct((prev) => ({
      ...prev,
      options: (prev.options || []).map((option, i) =>
        i === optionIndex
          ? { ...option, values: [...(option.values || []), ''] }
          : option
      ),
    }));
  };

  const updateOptionValue = (optionIndex: number, valueIndex: number, value: string) => {
    setCurrentProduct((prev) => ({
      ...prev,
      options: (prev.options || []).map((option, i) =>
        i === optionIndex
          ? {
              ...option,
              values: (option.values || []).map((v, vi) =>
                vi === valueIndex ? value : v
              ),
            }
          : option
      ),
    }));
  };

  const removeOptionValue = (optionIndex: number, valueIndex: number) => {
    setCurrentProduct((prev) => ({
      ...prev,
      options: (prev.options || []).map((option, i) =>
        i === optionIndex
          ? {
              ...option,
              values: (option.values || []).filter((_, vi) => vi !== valueIndex),
            }
          : option
      ),
    }));
  };

  const handleOptionTypeChange = (index: number, type: ProductOptionType) => {
    setCurrentProduct((prev) => ({
      ...prev,
      options: (prev.options || []).map((option, i) =>
        i === index
          ? {
              ...option,
              type,
              values:
                type === 'text' || type === 'textarea'
                  ? []
                  : option.values?.length
                    ? option.values
                    : [''],
            }
          : option
      ),
    }));
  };

  // Open Edit Product Modal
  const openEditModal = (product?: Product) => {
    if (product) {
      setCurrentProduct({ ...product });
    } else {
      setCurrentProduct({
        name: '',
        price: 0,
        category: 'Women',
        description: '',
        sizes: 'XS, S, M, L, XL',
        options: [],
        images: [],
        allow_personalisation: false,
        allow_requirements: false,
        is_visible: true,
        sort_order: products.length + 1,
      });
    }
    setProductFormError(null);
    setIsEditingProduct(true);
  };

  // Save Product Form
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError(null);

    if (!currentProduct.name?.trim()) {
      setProductFormError('Product name is required.');
      return;
    }
    if (currentProduct.price === undefined || currentProduct.price < 0) {
      setProductFormError('Please enter a valid non-negative price.');
      return;
    }
    if (!currentProduct.images || currentProduct.images.length === 0) {
      setProductFormError('Please upload at least one photo.');
      return;
    }

    const cleanedOptions = (currentProduct.options || [])
      .map((option) => ({
        ...option,
        name: option.name.trim(),
        values: (option.values || []).map((v) => v.trim()).filter(Boolean),
      }))
      .filter((option) => option.name);

    for (const option of cleanedOptions) {
      if (option.type !== 'text' && option.type !== 'textarea' && option.values.length === 0) {
        setProductFormError(`Add at least one value for "${option.name}".`);
        return;
      }
    }

    setIsSavingProduct(true);
    const productToSave: Partial<Product> = {
      ...currentProduct,
      options: cleanedOptions,
    };
    const result = await saveProduct(productToSave);
    setIsSavingProduct(false);

    if (result.error) {
      setProductFormError(result.error);
    } else {
      setIsEditingProduct(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string) => {
    const result = await deleteProduct(id);
    if (result.error) {
      alert(`Delete failed: ${result.error}`);
    }
    setDeleteConfirmId(null);
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccess(false);
    setSettingsError(null);
    setIsSavingSettings(true);

    const result = await saveSettings(settingsForm);
    setIsSavingSettings(false);

    if (result.error) {
      setSettingsError(result.error);
    } else {
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 4000);
    }
  };

  // Loading Screen
  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-muted">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  // 1. Password Recovery Screen (Requirement 1)
  if (isPasswordRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-ivory">
        <div className="max-w-md w-full bg-white border border-hairline rounded-lg p-8 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-gradient-gold">Set New Password</h2>
            <p className="text-muted text-xs sm:text-sm mt-1">
              Create a secure password for your owner account.
            </p>
          </div>

          {recoveryError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
              {recoveryError}
            </div>
          )}

          {recoverySuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Password updated successfully! Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                New Password (8+ characters)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white border border-hairline px-3.5 py-2.5 text-sm rounded focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-white border border-hairline px-3.5 py-2.5 text-sm rounded focus:outline-none focus:border-gold"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="btn-gold w-full text-center mt-2 flex items-center justify-center gap-2"
            >
              {isUpdatingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
              Save New Password
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Owner Login Screen (if not logged in)
  if (!user || !user.isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-ivory">
        <div className="max-w-md w-full bg-white border border-hairline rounded-lg p-8 shadow-xl">
          <div className="text-center mb-6">
            <img
              src="/assets/logo-round.png"
              alt="Global Luxury Emporium"
              className="w-12 h-12 mx-auto mb-3 object-contain"
            />
            <h2 className="font-serif text-2xl sm:text-3xl text-gradient-gold">Owner Portal</h2>
            <p className="text-muted text-xs sm:text-sm mt-1">
              Sign in with your registered owner credentials.
            </p>
          </div>

          {/* Missing Supabase Env Warning (Requirement 3) */}
          {!isSupabaseConfigured && (
            <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded leading-relaxed">
              <div className="flex items-center gap-2 font-medium text-amber-900 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span>Supabase Not Configured</span>
              </div>
              VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing. Changes cannot be saved to the database.
            </div>
          )}

          {loginError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
              {loginError}
            </div>
          )}

          {loginSuccessMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{loginSuccessMessage}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck="false"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Owners Email"
                  className="w-full bg-white border border-hairline px-3.5 py-2.5 pl-10 text-sm rounded focus:outline-none focus:border-gold"
                />
                <Mail className="w-4 h-4 text-muted absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-white border border-hairline px-3.5 py-2.5 pl-10 pr-10 text-sm rounded focus:outline-none focus:border-gold"
                />
                <Lock className="w-4 h-4 text-muted absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-muted hover:text-text focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-muted">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="rounded border-hairline text-gold focus:ring-gold"
                />
                Show password
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-gold hover:underline focus:outline-none"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="btn-gold w-full text-center mt-3 flex items-center justify-center gap-2"
            >
              {isLoggingIn && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Authenticated Owner Dashboard
  return (
    <div className="min-h-screen bg-white">
      {/* Admin Top Navigation */}
      <div className="bg-ivory border-b border-hairline py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl text-text font-semibold">Store Management</h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-medium">
              Owner Active
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted hidden sm:inline">{user.email}</span>
            <button
              onClick={logout}
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Requirement 3: Clear notice if Supabase env vars are missing */}
        {!isSupabaseConfigured && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block font-medium">Supabase Configuration Notice</strong>
              <p className="text-xs mt-1 text-amber-800 leading-relaxed">
                Supabase credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are not set. The dashboard is operating in demonstration preview mode. Changes cannot be permanently saved to the database until Supabase is connected.
              </p>
            </div>
          </div>
        )}

        {/* Admin Tabs */}
        <div className="flex border-b border-hairline mb-8">
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-3 px-6 text-sm uppercase tracking-widest font-medium border-b-2 transition-all ${
              activeTab === 'products'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            Products ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 px-6 text-sm uppercase tracking-widest font-medium border-b-2 transition-all ${
              activeTab === 'orders'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 px-6 text-sm uppercase tracking-widest font-medium border-b-2 transition-all ${
              activeTab === 'reviews'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`pb-3 px-6 text-sm uppercase tracking-widest font-medium border-b-2 transition-all ${
              activeTab === 'gallery'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            Featured Gallery
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-6 text-sm uppercase tracking-widest font-medium border-b-2 transition-all ${
              activeTab === 'settings'
                ? 'border-gold text-gold font-semibold'
                : 'border-transparent text-muted hover:text-text'
            }`}
          >
            Store Settings
          </button>
        </div>

        {/* TAB 1: PRODUCTS MANAGEMENT */}
        {activeTab === 'products' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted text-sm font-light">
                Manage your bespoke jacket catalog, photos, sizes, and custom options.
              </p>
              <button
                onClick={() => openEditModal()}
                className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add product
              </button>
            </div>

            {/* Products Table/List */}
            <div className="border border-hairline rounded divide-y divide-hairline bg-white shadow-sm overflow-hidden">
              {products.length === 0 ? (
                <div className="p-8 text-center text-muted font-light">
                  No products in catalog yet. Click "Add product" to create one.
                </div>
              ) : (
                products.map((p) => {
                  return (
                    <div
                      key={p.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-ivory/40 transition-colors"
                    >
                      {/* Product Thumbnail & Basic Info */}
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={p.images[0] || '/assets/products/shearling-aviator-jacket-main.png'}
                          alt={p.name}
                          className="w-16 h-20 object-cover rounded border border-hairline flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif text-lg text-text font-medium truncate">
                              {p.name}
                            </h3>
                            {/* Requirement 5: Visibility indicator */}
                            {!p.is_visible && (
                              <span className="text-[10px] uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                                Hidden
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted mt-0.5">
                            <span className="text-gold font-medium">{settings.currency}{p.price.toFixed(2)}</span>
                            {' • '}
                            <span>{p.category}</span>
                            {' • '}
                            <span>Sort: {p.sort_order}</span>
                          </p>
                        </div>
                      </div>

                      {/* Actions & Hide Product Switch (Requirement 5) */}
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        {/* Requirement 5: "Hide product" switch */}
                        <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={!p.is_visible}
                            onChange={(e) => toggleProductVisibility(p.id, !e.target.checked)}
                            className="rounded border-hairline text-gold focus:ring-gold"
                          />
                          <span>Hide</span>
                        </label>

                        <button
                          onClick={() => openEditModal(p)}
                          className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>

                        {deleteConfirmId === p.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              className="text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 font-medium"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="text-xs text-muted px-2 py-1.5 hover:text-text"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            className="text-muted hover:text-red-600 p-2 transition-colors rounded"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl text-gradient-gold">Customer Orders</h2>
                <p className="text-muted text-xs font-light mt-1">
                  All customer orders captured on-site with live Stripe payment status and itemised charges.
                </p>
              </div>
              <button
                onClick={handleRefreshOrders}
                disabled={isRefreshingOrders}
                className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5 self-start sm:self-auto"
                title="Refresh orders from Supabase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingOrders ? 'animate-spin text-gold' : ''}`} />
                <span>Refresh orders</span>
              </button>
            </div>

            {/* Orders Metric Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white border border-hairline p-4 rounded-lg">
                <span className="text-[11px] uppercase tracking-wider text-muted font-medium block">
                  Total Orders
                </span>
                <span className="text-2xl font-serif font-bold text-text mt-1 block">
                  {orders.length}
                </span>
              </div>
              <div className="bg-white border border-hairline p-4 rounded-lg">
                <span className="text-[11px] uppercase tracking-wider text-emerald-700 font-medium block">
                  Paid
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-serif font-bold text-emerald-800">
                    {orders.filter((o) => o.status === 'paid').length}
                  </span>
                  <span className="text-xs text-muted">
                    ({settings.currency}
                    {orders
                      .filter((o) => o.status === 'paid')
                      .reduce((sum, o) => sum + (o.total_amount || 0), 0)
                      .toFixed(2)})
                  </span>
                </div>
              </div>
              <div className="bg-white border border-hairline p-4 rounded-lg">
                <span className="text-[11px] uppercase tracking-wider text-amber-700 font-medium block">
                  Pending Payment
                </span>
                <span className="text-2xl font-serif font-bold text-amber-800 mt-1 block">
                  {orders.filter((o) => o.status === 'pending').length}
                </span>
              </div>
              <div className="bg-white border border-hairline p-4 rounded-lg">
                <span className="text-[11px] uppercase tracking-wider text-red-700 font-medium block">
                  Failed
                </span>
                <span className="text-2xl font-serif font-bold text-red-800 mt-1 block">
                  {orders.filter((o) => o.status === 'failed').length}
                </span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 border border-hairline rounded-lg">
              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(['all', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'pending', 'failed'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setOrderFilter(filter)}
                    className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded transition-colors font-medium whitespace-nowrap ${
                      orderFilter === filter
                        ? 'bg-text text-white'
                        : 'text-muted hover:text-text hover:bg-ivory'
                    }`}
                  >
                    {filter === 'all' ? 'All Orders' : filter}
                  </button>
                ))}
              </div>

              {/* Search Field */}
              <div className="relative sm:w-72">
                <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search customer, jacket, email..."
                  className="w-full bg-ivory/50 border border-hairline rounded pl-8 pr-3 py-1.5 text-xs text-text placeholder-muted focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            {/* Orders List */}
            {orders.length === 0 ? (
              <div className="bg-white border border-hairline rounded-lg p-12 text-center">
                <ShoppingBag className="w-10 h-10 text-muted/40 mx-auto mb-3" />
                <h3 className="font-serif text-lg text-text font-medium mb-1">No orders captured yet</h3>
                <p className="text-xs text-muted font-light max-w-md mx-auto">
                  When customers purchase bespoke jackets on the site, their order details, delivery address, and Stripe payment status will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders
                  .filter((order) => {
                    if (orderFilter !== 'all' && order.status !== orderFilter) return false;
                    if (orderSearch.trim()) {
                      const q = orderSearch.toLowerCase();
                      const matchName = order.customer_name?.toLowerCase().includes(q);
                      const matchEmail = order.email?.toLowerCase().includes(q);
                      const matchProduct = order.product_name?.toLowerCase().includes(q);
                      const matchId = order.id?.toLowerCase().includes(q);
                      const matchCity = order.address?.city?.toLowerCase().includes(q);
                      const matchCountry = order.address?.country?.toLowerCase().includes(q);
                      return Boolean(matchName || matchEmail || matchProduct || matchId || matchCity || matchCountry);
                    }
                    return true;
                  })
                  .map((order) => {
                    const orderDate = new Date(order.created_at);
                    const formattedDate = isNaN(orderDate.getTime())
                      ? order.created_at
                      : orderDate.toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                    return (
                      <div
                        key={order.id}
                        className="bg-white border border-hairline rounded-lg overflow-hidden shadow-sm hover:border-gold/50 transition-colors"
                      >
                        {/* Order Header */}
                        <div className="bg-ivory/50 border-b border-hairline px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-muted uppercase tracking-wider text-[11px]" title={order.id}>
                              Order #{order.id.slice(0, 8)}
                            </span>
                            <span className="text-muted">•</span>
                            <span className="text-muted">{formattedDate}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {order.status === 'delivered' && (
                              <span
                                className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gold/10 text-gold-dark border border-gold/40 flex items-center gap-1"
                                title="Customer can now review this product"
                              >
                                <BadgeCheck className="w-3 h-3" /> Review eligible
                              </span>
                            )}

                            <label className="flex items-center gap-1.5">
                              <span className="text-[10px] uppercase tracking-wider text-muted hidden sm:inline">
                                Status
                              </span>
                              <select
                                value={order.status}
                                disabled={updatingOrderId === order.id}
                                onChange={(e) =>
                                  handleOrderStatusChange(order.id, e.target.value as OrderStatus)
                                }
                                className={`text-xs font-medium rounded border px-2 py-1 focus:outline-none focus:border-gold ${
                                  order.status === 'delivered'
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                    : order.status === 'cancelled' || order.status === 'failed'
                                      ? 'bg-red-50 border-red-300 text-red-800'
                                      : order.status === 'pending'
                                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                                        : 'bg-white border-hairline text-text'
                                }`}
                              >
                                <option value="pending">Pending payment</option>
                                <option value="paid">Paid</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="failed">Payment failed</option>
                              </select>
                              {updatingOrderId === order.id && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-gold" />
                              )}
                            </label>
                          </div>
                        </div>

                        {/* Order Body: 3-column editorial breakdown */}
                        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                          {/* Column 1: Customer & Delivery Address */}
                          <div className="space-y-3">
                            <h4 className="uppercase tracking-wider text-[10px] font-semibold text-gold-dark border-b border-hairline pb-1">
                              Customer & Shipping
                            </h4>
                            <div>
                              <p className="font-medium text-text text-sm">{order.customer_name}</p>
                              <a
                                href={`mailto:${order.email}`}
                                className="text-gold hover:underline block text-xs mt-0.5"
                              >
                                {order.email}
                              </a>
                            </div>

                            <div className="text-muted leading-relaxed pt-1">
                              <p className="text-text">{order.address?.line1}</p>
                              <p>{order.address?.city}, {order.address?.postal_code}</p>
                              <p className="font-medium text-text">{order.address?.country}</p>
                            </div>

                            <div className="pt-1 text-[11px] text-muted flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                              <span>Zone: <strong className="text-text font-medium">{order.delivery_zone}</strong></span>
                            </div>
                          </div>

                          {/* Column 2: Jacket & Bespoke Options */}
                          <div className="space-y-3">
                            <h4 className="uppercase tracking-wider text-[10px] font-semibold text-gold-dark border-b border-hairline pb-1">
                              Bespoke Specification
                            </h4>
                            <div>
                              <p className="font-serif text-base text-text font-medium">{order.product_name}</p>
                              <p className="text-xs text-muted mt-0.5">
                                Size: <span className="font-semibold text-text uppercase px-1.5 py-0.5 bg-ivory rounded border border-hairline ml-1">{order.size}</span>
                              </p>
                            </div>

                            {/* Dynamically selected product options (e.g. Color) */}
                            {order.selected_options && Object.keys(order.selected_options).length > 0 && (
                              <div className="space-y-1 pt-1">
                                {Object.entries(order.selected_options).map(([optName, optVal]) => (
                                  <p key={optName} className="text-muted">
                                    <span className="font-medium text-text">{optName}:</span> {optVal}
                                  </p>
                                ))}
                              </div>
                            )}

                            {/* Personalisation */}
                            <div className="pt-1">
                              <span className="text-[10px] uppercase tracking-wider text-muted font-medium block">
                                Personalisation
                              </span>
                              {order.personalisation_text ? (
                                <p className="italic text-text font-serif text-sm bg-ivory/60 p-2 rounded border border-hairline mt-1">
                                  "{order.personalisation_text}"
                                </p>
                              ) : (
                                <p className="text-muted text-[11px] italic mt-0.5">None requested</p>
                              )}
                            </div>

                            {/* Requirements */}
                            <div className="pt-1">
                              <span className="text-[10px] uppercase tracking-wider text-muted font-medium block">
                                Additional Requirements
                              </span>
                              {order.requirements_text ? (
                                <p className="text-text text-xs bg-ivory/60 p-2 rounded border border-hairline mt-1 whitespace-pre-wrap">
                                  {order.requirements_text}
                                </p>
                              ) : (
                                <p className="text-muted text-[11px] italic mt-0.5">None requested</p>
                              )}
                            </div>
                          </div>

                          {/* Column 3: Itemised Charges & Stripe Intent */}
                          <div className="space-y-3">
                            <h4 className="uppercase tracking-wider text-[10px] font-semibold text-gold-dark border-b border-hairline pb-1">
                              Itemised Charges
                            </h4>
                            <div className="space-y-1.5 divide-y divide-hairline/60">
                              <div className="flex justify-between items-center py-1">
                                <span className="text-muted">Jacket Price:</span>
                                <span className="text-text font-medium">
                                  {settings.currency}{order.product_price.toFixed(2)}
                                </span>
                              </div>

                              {order.personalisation_fee > 0 && (
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-muted">Personalisation:</span>
                                  <span className="text-text font-medium">
                                    +{settings.currency}{order.personalisation_fee.toFixed(2)}
                                  </span>
                                </div>
                              )}

                              {order.requirements_fee > 0 && (
                                <div className="flex justify-between items-center py-1">
                                  <span className="text-muted">Requirements:</span>
                                  <span className="text-text font-medium">
                                    +{settings.currency}{order.requirements_fee.toFixed(2)}
                                  </span>
                                </div>
                              )}

                              <div className="flex justify-between items-center py-1">
                                <span className="text-muted">Delivery ({order.delivery_zone}):</span>
                                <span className="text-text font-medium">
                                  {order.delivery_price > 0
                                    ? `${settings.currency}${order.delivery_price.toFixed(2)}`
                                    : 'Free'}
                                </span>
                              </div>

                              <div className="flex justify-between items-center pt-2 font-semibold text-sm">
                                <span className="text-text">Total Charged:</span>
                                <span className="text-gold text-base font-bold">
                                  {settings.currency}{order.total_amount.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Stripe Payment Intent ID */}
                            <div className="pt-2">
                              <span className="text-[10px] uppercase tracking-wider text-muted font-medium block">
                                Stripe Payment Intent
                              </span>
                              <code className="block mt-1 font-mono text-[10px] bg-ivory p-1.5 rounded border border-hairline text-text truncate select-all" title={order.stripe_payment_intent_id}>
                                {order.stripe_payment_intent_id || 'N/A'}
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* TAB: REVIEWS MODERATION */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl text-gradient-gold">Customer Reviews</h2>
                <p className="text-muted text-xs font-light mt-1">
                  Reviews are written only by verified customers through the secure checkout-verification service. The Verified Purchase badge is set server-side and cannot be claimed by shoppers.
                </p>
              </div>
              <button
                onClick={refreshReviews}
                className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh reviews</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {(['all', 'published', 'hidden'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setReviewFilter(filter)}
                  className={`text-xs uppercase tracking-wider px-3 py-1.5 rounded transition-colors font-medium ${
                    reviewFilter === filter
                      ? 'bg-text text-white'
                      : 'text-muted hover:text-text hover:bg-ivory'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {reviews.length === 0 ? (
              <div className="bg-white border border-hairline rounded-lg p-12 text-center">
                <Star className="w-10 h-10 text-muted/40 mx-auto mb-3" />
                <h3 className="font-serif text-lg text-text font-medium mb-1">No reviews yet</h3>
                <p className="text-xs text-muted font-light max-w-md mx-auto">
                  Once an order is marked Delivered, the customer can leave a verified review for that product. It will appear here for moderation.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews
                  .filter((r) =>
                    reviewFilter === 'all'
                      ? true
                      : reviewFilter === 'published'
                        ? r.published
                        : !r.published
                  )
                  .map((review) => (
                    <div
                      key={review.id}
                      className="bg-white border border-hairline rounded-lg p-4 sm:p-5 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-serif text-base text-text font-medium">
                              {productNameById(review.product_id)}
                            </span>
                            {review.verified && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full font-medium">
                                <BadgeCheck className="w-3 h-3" /> Verified Purchase
                              </span>
                            )}
                            {!review.published && (
                              <span className="text-[10px] uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                                Hidden
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-0.5 text-gold">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <Star
                                  key={n}
                                  className={`w-3.5 h-3.5 ${n <= review.rating ? 'fill-gold' : 'text-hairline'}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted">
                              by {review.customer_name || 'Customer'} ·{' '}
                              {new Date(review.created_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleReviewPublished(review)}
                            disabled={reviewActionBusy === review.id}
                            className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            {review.published ? 'Hide' : 'Publish'}
                          </button>
                          {editingReviewId === review.id ? null : (
                            <button
                              onClick={() => startEditReview(review)}
                              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteReview(review.id)}
                            disabled={reviewActionBusy === review.id}
                            className="text-muted hover:text-red-600 p-2 transition-colors rounded"
                            title="Delete review"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {editingReviewId === review.id ? (
                        <div className="mt-4 space-y-3 border-t border-hairline pt-4">
                          <div>
                            <label className="block text-[11px] uppercase tracking-wider font-medium text-text mb-1">
                              Rating
                            </label>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() => setEditReviewRating(n)}
                                  className="p-0.5"
                                  aria-label={`Set rating ${n}`}
                                >
                                  <Star
                                    className={`w-5 h-5 ${n <= editReviewRating ? 'fill-gold text-gold' : 'text-hairline'}`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] uppercase tracking-wider font-medium text-text mb-1">
                              Review text
                            </label>
                            <textarea
                              rows={3}
                              value={editReviewText}
                              onChange={(e) => setEditReviewText(e.target.value)}
                              className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold resize-none"
                            />
                          </div>
                          <p className="text-[11px] text-muted">
                            Product, customer, order, and Verified Purchase status cannot be changed here.
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveReviewEdits(review.id)}
                              disabled={reviewActionBusy === review.id}
                              className="btn-gold text-xs py-2 px-4 flex items-center gap-1.5"
                            >
                              {reviewActionBusy === review.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              Save changes
                            </button>
                            <button
                              onClick={() => setEditingReviewId(null)}
                              className="btn-ghost text-xs py-2 px-3"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-text font-light whitespace-pre-wrap">
                          {review.review}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: FEATURED GALLERY */}
        {activeTab === 'gallery' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl text-gradient-gold">Featured Gallery</h2>
                <p className="text-muted text-xs font-light mt-1 max-w-2xl">
                  Choose the images that rotate on the home page. Enable or disable individual images, reorder them, and set alt text. The gallery cross-fades automatically; if nothing is active, the section is hidden.
                </p>
              </div>
              <button
                onClick={refreshFeaturedImages}
                className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {galleryError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {galleryError}
              </div>
            )}

            {/* Upload + quick-add from existing product images */}
            <div className="bg-white border border-hairline rounded-lg p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <label className="btn-gold text-xs py-2 px-4 inline-flex items-center gap-2 cursor-pointer">
                  {isUploadingFeatured ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Upload images
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isUploadingFeatured}
                    onChange={handleFeaturedFilesSelected}
                    className="hidden"
                  />
                </label>
                <span className="text-[11px] text-muted">
                  Or add an existing product photo below.
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {products.flatMap((p) => p.images).slice(0, 24).map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => handleAddProductImageToGallery(img)}
                    className="relative w-16 h-20 rounded overflow-hidden border border-hairline hover:border-gold group"
                    title="Add to featured gallery"
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Plus className="w-5 h-5 text-white" />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Current featured images */}
            {featuredImages.length === 0 ? (
              <div className="bg-white border border-hairline rounded-lg p-12 text-center">
                <ImageIcon className="w-10 h-10 text-muted/40 mx-auto mb-3" />
                <h3 className="font-serif text-lg text-text font-medium mb-1">No featured images</h3>
                <p className="text-xs text-muted font-light max-w-md mx-auto">
                  Upload or select images above to build the rotating home-page gallery.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredImages.map((img, index) => (
                  <div
                    key={img.id}
                    className={`bg-white border rounded-lg overflow-hidden shadow-sm ${
                      img.is_active ? 'border-hairline' : 'border-hairline opacity-60'
                    }`}
                  >
                    <div className="aspect-[4/5] bg-ivory">
                      <img src={img.image_url} alt={img.alt_text} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3 space-y-2">
                      <input
                        type="text"
                        value={img.alt_text}
                        placeholder="Alt text (optional)"
                        onChange={(e) =>
                          updateFeaturedImage(img.id, { alt_text: e.target.value })
                        }
                        className="w-full bg-white border border-hairline px-2.5 py-1.5 text-xs rounded focus:border-gold"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={img.is_active}
                            onChange={(e) =>
                              updateFeaturedImage(img.id, { is_active: e.target.checked })
                            }
                            className="rounded border-hairline text-gold focus:ring-gold"
                          />
                          Active
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveFeatured(index, -1)}
                            disabled={index === 0}
                            className="p-1.5 text-muted hover:text-text disabled:opacity-30"
                            title="Move up"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMoveFeatured(index, 1)}
                            disabled={index === featuredImages.length - 1}
                            className="p-1.5 text-muted hover:text-text disabled:opacity-30"
                            title="Move down"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteFeaturedImage(img.id)}
                            className="p-1.5 text-muted hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STORE SETTINGS MANAGEMENT */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="max-w-3xl bg-white border border-hairline rounded-lg p-6 sm:p-8 shadow-sm space-y-8">
            <div>
              <h2 className="font-serif text-2xl text-gradient-gold">Store & Contact Settings</h2>
              <p className="text-muted text-xs font-light mt-1">
                Updates save straight to Supabase and reflect live immediately.
              </p>
            </div>

            {settingsSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Settings saved successfully!</span>
              </div>
            )}

            {settingsError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {settingsError}
              </div>
            )}

            {/* General Contact Details */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-gold-dark border-b border-hairline pb-2">
                Company & Contact Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    value={settingsForm.currency}
                    onChange={(e) => setSettingsForm({ ...settingsForm, currency: e.target.value })}
                    className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                    Company Registration Number
                  </label>
                  <input
                    type="text"
                    value={settingsForm.company_number}
                    onChange={(e) => setSettingsForm({ ...settingsForm, company_number: e.target.value })}
                    placeholder="e.g. 12345678"
                    className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                    WhatsApp Number (with country code)
                  </label>
                  <input
                    type="text"
                    value={settingsForm.whatsapp}
                    onChange={(e) => setSettingsForm({ ...settingsForm, whatsapp: e.target.value })}
                    placeholder="+923278434142"
                    className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                    Contact Email Address
                  </label>
                  <input
                    type="email"
                    value={settingsForm.contact_email}
                    onChange={(e) => setSettingsForm({ ...settingsForm, contact_email: e.target.value })}
                    placeholder="globalluxuryemporium@gmail.com"
                    className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                  Registered Office Address
                </label>
                <input
                  type="text"
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  placeholder="London, United Kingdom"
                  className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                    Instagram URL
                  </label>
                  <input
                    type="text"
                    value={settingsForm.instagram_url}
                    onChange={(e) => setSettingsForm({ ...settingsForm, instagram_url: e.target.value })}
                    className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                    Facebook URL
                  </label>
                  <input
                    type="text"
                    value={settingsForm.facebook_url}
                    onChange={(e) => setSettingsForm({ ...settingsForm, facebook_url: e.target.value })}
                    className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                  />
                </div>
              </div>
            </div>

            {/* Personalisation Configuration */}
            <div className="space-y-4 pt-4 border-t border-hairline">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-gold-dark border-b border-hairline pb-2">
                Personalisation pricing
              </h3>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.personalisation.enabled}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        personalisation: { ...settingsForm.personalisation, enabled: e.target.checked },
                      })
                    }
                    className="rounded border-hairline text-gold focus:ring-gold"
                  />
                  <span>Show the text box on products that allow it</span>
                </label>

                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.personalisation.charge}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        personalisation: { ...settingsForm.personalisation, charge: e.target.checked },
                      })
                    }
                    className="rounded border-hairline text-gold focus:ring-gold"
                  />
                  <span>Charge extra for personalisation</span>
                </label>

                {settingsForm.personalisation.charge && (
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                      Extra Charge ({settingsForm.currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={settingsForm.personalisation.price}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          personalisation: { ...settingsForm.personalisation, price: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-48 bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                      Box Label
                    </label>
                    <input
                      type="text"
                      value={settingsForm.personalisation.label}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          personalisation: { ...settingsForm.personalisation, label: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                      Box Hint (maxlength 30)
                    </label>
                    <input
                      type="text"
                      maxLength={30}
                      value={settingsForm.personalisation.hint}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          personalisation: { ...settingsForm.personalisation, hint: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Requirements Configuration */}
            <div className="space-y-4 pt-4 border-t border-hairline">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-gold-dark border-b border-hairline pb-2">
                Additional requirements pricing
              </h3>

              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.requirements.enabled}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        requirements: { ...settingsForm.requirements, enabled: e.target.checked },
                      })
                    }
                    className="rounded border-hairline text-gold focus:ring-gold"
                  />
                  <span>Show this box on jackets where you allow it</span>
                </label>

                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.requirements.charge}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        requirements: { ...settingsForm.requirements, charge: e.target.checked },
                      })
                    }
                    className="rounded border-hairline text-gold focus:ring-gold"
                  />
                  <span>Charge extra when a customer uses it</span>
                </label>

                {settingsForm.requirements.charge && (
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                      Extra Charge ({settingsForm.currency})
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={settingsForm.requirements.price}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          requirements: { ...settingsForm.requirements, price: parseFloat(e.target.value) || 0 },
                        })
                      }
                      className="w-48 bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                      Box Label
                    </label>
                    <input
                      type="text"
                      value={settingsForm.requirements.label}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          requirements: { ...settingsForm.requirements, label: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                      Box Hint (maxlength 110)
                    </label>
                    <input
                      type="text"
                      maxLength={110}
                      value={settingsForm.requirements.hint}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          requirements: { ...settingsForm.requirements, hint: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Pricing Configuration */}
            <div className="space-y-4 pt-4 border-t border-hairline">
              <div className="flex items-center justify-between border-b border-hairline pb-2">
                <div>
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-gold-dark">
                    Delivery pricing
                  </h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    Configure customer delivery destinations and shipping costs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addDeliveryZone}
                  className="btn-ghost text-xs py-1 px-3 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add zone
                </button>
              </div>

              <div className="space-y-3">
                {(settingsForm.delivery_zones || []).map((zone, idx) => (
                  <div key={zone.id || idx} className="flex items-center gap-3 bg-ivory/40 p-3 rounded border border-hairline">
                    <div className="flex-1">
                      <label className="block text-[10px] uppercase tracking-wider font-medium text-text mb-1">
                        Zone / Region Name
                      </label>
                      <input
                        type="text"
                        value={zone.name}
                        onChange={(e) => updateDeliveryZone(idx, { name: e.target.value })}
                        placeholder="e.g. United Kingdom"
                        className="w-full bg-white border border-hairline px-3 py-1.5 text-sm rounded focus:border-gold"
                      />
                    </div>
                    <div className="w-36">
                      <label className="block text-[10px] uppercase tracking-wider font-medium text-text mb-1">
                        Price ({settingsForm.currency})
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={zone.price}
                        onChange={(e) => updateDeliveryZone(idx, { price: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white border border-hairline px-3 py-1.5 text-sm rounded focus:border-gold"
                      />
                    </div>
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => removeDeliveryZone(idx)}
                        disabled={(settingsForm.delivery_zones || []).length <= 1}
                        className="p-2 text-muted hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Remove delivery zone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSavingSettings}
                className="btn-gold flex items-center gap-2"
              >
                {isSavingSettings && <Loader2 className="w-4 h-4 animate-spin" />}
                Save settings
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 4. PRODUCT EDIT / ADD MODAL */}
      {isEditingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditingProduct(false);
          }}
        >
          <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white border border-hairline rounded-lg p-6 sm:p-8 shadow-2xl">
            <h2 className="font-serif text-2xl sm:text-3xl text-gradient-gold mb-4">
              {currentProduct.id ? 'Edit Product' : 'Add New Jacket'}
            </h2>

            {productFormError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {productFormError}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Multi-Image Upload & Thumbnails */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                  Photos (First is main photo, second shows on hover, up to 8 photos)
                </label>

                {/* Existing thumbnails */}
                <div className="flex flex-wrap gap-3 mb-3">
                  {(currentProduct.images || []).map((img, idx) => (
                    <div key={idx} className="relative w-20 h-24 border border-hairline rounded overflow-hidden group bg-ivory">
                      <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                        {idx !== 0 ? (
                          <button
                            type="button"
                            onClick={() => handleMakeMainImage(idx)}
                            className="text-[9px] bg-gold text-black px-1.5 py-0.5 rounded uppercase font-semibold"
                          >
                            Main
                          </button>
                        ) : (
                          <span className="text-[9px] text-white uppercase font-bold tracking-wider">
                            Main
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upload Button */}
                {(currentProduct.images || []).length < 8 && (
                  <div className="relative">
                    <label className="btn-ghost inline-flex items-center gap-2 cursor-pointer text-xs">
                      {isUploadingImages ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-gold" />
                          <span>Compressing & Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Upload Photos (Max 8)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={isUploadingImages}
                        onChange={handleImageFilesSelected}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Name & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                    Jacket Name
                  </label>
                  <input
                    type="text"
                    required
                    value={currentProduct.name || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                    className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                    Price ({settings.currency})
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={currentProduct.price ?? ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                  />
                </div>
              </div>

              {/* Category & Sizes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    list="category-options"
                    value={currentProduct.category || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, category: e.target.value })}
                    className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                  />
                  <datalist id="category-options">
                    <option value="Women" />
                    <option value="Men" />
                    <option value="Unisex" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                    Sizes (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={currentProduct.sizes || ''}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, sizes: e.target.value })}
                    placeholder="XS, S, M, L, XL"
                    className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={currentProduct.description || ''}
                  onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                  className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold resize-none"
                />
              </div>

              {/* Sort Order & Visibility Switch (Requirement 5) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-ivory/60 rounded border border-hairline">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-medium text-text mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={currentProduct.sort_order ?? 1}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-hairline px-3 py-1.5 text-sm rounded focus:border-gold"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-text">
                    <input
                      type="checkbox"
                      checked={currentProduct.is_visible ?? true}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, is_visible: e.target.checked })}
                      className="rounded border-hairline text-gold focus:ring-gold"
                    />
                    <span>Visible in collection</span>
                  </label>
                </div>
              </div>

              {/* Flexible Product Options */}
              <div className="pt-4 border-t border-hairline space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider font-semibold text-gold-dark">
                      Product Options
                    </h4>
                    <p className="text-[11px] text-muted mt-1">
                      Add options such as Color, Leather Type, Lining, Style, or any other customer choice.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addProductOption}
                    className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add option
                  </button>
                </div>

                {productOptions.length === 0 ? (
                  <div className="p-4 bg-ivory/60 border border-hairline rounded text-xs text-muted">
                    No extra options configured. The existing Size selector will still be shown to customers.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {productOptions.map((option, optionIndex) => {
                      const usesValues = option.type !== 'text' && option.type !== 'textarea';

                      return (
                        <div
                          key={optionIndex}
                          className="border border-hairline rounded-lg p-4 bg-ivory/30 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-text">
                              Option {optionIndex + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeProductOption(optionIndex)}
                              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] uppercase tracking-wider font-medium text-text mb-1">
                                Option Name
                              </label>
                              <input
                                type="text"
                                value={option.name}
                                onChange={(e) =>
                                  updateProductOption(optionIndex, { name: e.target.value })
                                }
                                placeholder="e.g. Color"
                                className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] uppercase tracking-wider font-medium text-text mb-1">
                                Input Type
                              </label>
                              <select
                                value={option.type}
                                onChange={(e) =>
                                  handleOptionTypeChange(
                                    optionIndex,
                                    e.target.value as ProductOptionType
                                  )
                                }
                                className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                              >
                                <option value="select">Dropdown</option>
                                <option value="radio">Buttons</option>
                                <option value="color">Color choices</option>
                                <option value="text">Short text</option>
                                <option value="textarea">Long text</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] uppercase tracking-wider font-medium text-text mb-1">
                                Customer-Facing Label
                              </label>
                              <input
                                type="text"
                                value={option.label || ''}
                                onChange={(e) =>
                                  updateProductOption(optionIndex, { label: e.target.value })
                                }
                                placeholder={option.name || 'Optional label'}
                                className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] uppercase tracking-wider font-medium text-text mb-1">
                                Placeholder
                              </label>
                              <input
                                type="text"
                                value={option.placeholder || ''}
                                onChange={(e) =>
                                  updateProductOption(optionIndex, { placeholder: e.target.value })
                                }
                                placeholder="Optional"
                                className="w-full bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                              />
                            </div>
                          </div>

                          <label className="flex items-center gap-2 text-xs text-text cursor-pointer">
                            <input
                              type="checkbox"
                              checked={option.required}
                              onChange={(e) =>
                                updateProductOption(optionIndex, { required: e.target.checked })
                              }
                              className="rounded border-hairline text-gold focus:ring-gold"
                            />
                            Required option
                          </label>

                          {usesValues && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="block text-[11px] uppercase tracking-wider font-medium text-text">
                                  Option Values
                                </label>
                                <button
                                  type="button"
                                  onClick={() => addOptionValue(optionIndex)}
                                  className="text-[11px] text-gold hover:underline"
                                >
                                  + Add value
                                </button>
                              </div>

                              <div className="space-y-2">
                                {(option.values || []).map((value, valueIndex) => (
                                  <div key={valueIndex} className="flex items-center gap-2">
                                    {option.type === 'color' && (
                                      <input
                                        type="color"
                                        value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#000000'}
                                        onChange={(e) =>
                                          updateOptionValue(optionIndex, valueIndex, e.target.value)
                                        }
                                        className="w-9 h-9 p-0.5 bg-white border border-hairline rounded cursor-pointer"
                                        title="Choose color"
                                      />
                                    )}
                                    <input
                                      type="text"
                                      value={value}
                                      onChange={(e) =>
                                        updateOptionValue(optionIndex, valueIndex, e.target.value)
                                      }
                                      placeholder={
                                        option.type === 'color'
                                          ? 'e.g. Black or #000000'
                                          : 'e.g. Black'
                                      }
                                      className="flex-1 bg-white border border-hairline px-3 py-2 text-sm rounded focus:border-gold"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeOptionValue(optionIndex, valueIndex)}
                                      disabled={(option.values || []).length <= 1}
                                      className="p-2 text-muted hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                      title="Remove value"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(option.type === 'text' || option.type === 'textarea') && (
                            <p className="text-[11px] text-muted">
                              Customers will enter their own value for this option.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Feature Checkboxes */}
              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(currentProduct.allow_personalisation)}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, allow_personalisation: e.target.checked })}
                    className="rounded border-hairline text-gold focus:ring-gold"
                  />
                  <span>Allow personalisation on this jacket</span>
                </label>

                <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(currentProduct.allow_requirements)}
                    onChange={(e) => setCurrentProduct({ ...currentProduct, allow_requirements: e.target.checked })}
                    className="rounded border-hairline text-gold focus:ring-gold"
                  />
                  <span>Allow additional requirements box on this jacket</span>
                </label>
              </div>



              {/* Form Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingProduct(false)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct || isUploadingImages}
                  className="btn-gold flex items-center gap-2"
                >
                  {isSavingProduct && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};