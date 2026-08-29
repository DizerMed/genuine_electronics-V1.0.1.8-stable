import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import { Product, Order, POSTransaction, Staff, Category, StoreSettings, formatTZS, formatToGMT3, getEATCurrentParts, BRAND_LOGO_URL, CustomerProfile, UserProfile, CategoryItem, ExtraCost, VisitorAnalyticsSummary } from '../types';

import { shareProduct } from '../utils/share';
import { exportProductsToCSV, exportSalesToCSV, exportLoansToCSV, exportTaxJournalToCSV } from '../utils/exportData';
import { triggerHaptic } from '../utils/haptics';
import { isLoanTransaction } from '../utils/loanUtils';
import { LayoutDashboard, Package, ShoppingCart, Users, BarChart3, Plus, Search, ShieldCheck, AlertTriangle, Edit, Trash2, Printer, CheckCircle, RefreshCw, DollarSign, ArrowUpRight, Check, X, QrCode, User, Mail, MapPin, Copy, Camera, Scan, Zap, Sparkles, Sun, Moon, Monitor, Settings, Tags, Upload, UploadCloud, Type, Image as ImageIcon, Eye, Grid, List, FolderPlus, Globe, Link, Lock, LogOut, Truck, Phone, Key, MessageCircle, Download, UserCheck, UserX, Calendar, BadgeCheck, Bell, BellRing, Award, FileSpreadsheet, ExternalLink, ShieldAlert, ChevronRight, Activity, Filter, Database, Server, HardDrive, CheckCircle2, Menu, Keyboard, Command, Save, FileText, Star, GripVertical, ArrowLeftRight, ImagePlus, ZoomIn, Layers, Move, Share2, ChevronUp, ChevronDown, ArrowLeft, ArrowRight, Pause, RotateCcw, Minus, Percent, Banknote, History, Wifi, WifiOff, FileCheck2, Split, Barcode, Hash, CreditCard } from 'lucide-react';

import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

import { QRCodeSVG } from 'qrcode.react';

import {

  DndContext,

  closestCenter,

  KeyboardSensor,

  PointerSensor,

  useSensor,

  useSensors,

  DragOverlay,

  useDroppable,

  DragStartEvent,

  DragEndEvent,

} from '@dnd-kit/core';

import {

  arrayMove,

  SortableContext,

  sortableKeyboardCoordinates,

  verticalListSortingStrategy,

  rectSortingStrategy,

  useSortable,

} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';

import { POSReceiptModal } from './POSReceiptModal';
import { POSZReportModal } from './POSZReportModal';
import { InvoicePrintModal } from './InvoicePrintModal';
import { formatTzPhone } from '../utils/phoneFormat';
import { LoanTracker } from './LoanTracker';
import { queueStockDelta } from "../lib/useSupabase";
import { POSSalesHistory } from './POSSalesHistory';
import { fetchSupabaseStatus, useSupabaseSyncStatus, notifySyncStatus, getRateLimitStatus } from '../lib/useSupabase';
import { DebtAnalytics } from './DebtAnalytics';
import { TemplatePreview } from './TemplatePreview';
import { AdminShortcutCheatSheetModal } from './AdminShortcutCheatSheetModal';
import { POSSalePreviewModal } from './POSSalePreviewModal';
import { FullScreenSaveLoader } from './FullScreenSaveLoader';
import { AdminAuditLogs } from './AdminAuditLogs';
import { recordAuditLog } from '../lib/enterpriseAuditService';
import { sendNotificationMessage, buildNotificationMessage } from '../lib/notificationService';

import { AdminCommandPalette } from './AdminCommandPalette';
import { ProductDescriptionEditor } from './ProductDescriptionEditor';
import { ProductDescriptionView } from './ProductDescriptionView';
import { CategoryProductsPreviewModal } from './CategoryProductsPreviewModal';
import { AdminVisitorAnalytics } from './AdminVisitorAnalytics';
import { VisitorActivityHeatmap } from './VisitorActivityHeatmap';
import { TopViewedProductsBreakdown } from './TopViewedProductsBreakdown';
import { fetchVisitorSummary } from '../lib/visitorTrackingService';



const localSwahiliSuggestions: Record<string, string> = {

  'Computers & Tablets': 'Kompyuta na Kompyuta Mpakato',

  'Smartphones & Mobile': 'Simu za Mkononi',

  'Televisions & Home Audio': 'TV na Sauti za Nyumbani',

  'Gaming & Consoles': 'Michezo ya Video',

  'Cameras & Drone Tech': 'Kamera na Ndege Isiyo na Rubani',

  'Smart Home & IoT': 'Nyumba za Kijanja',

  'Accessories & Wearables': 'Vifaa vya Mkononi na Saa',

  'Air Conditioners & Cooling': 'Makondishona na Vipoaji',

  'Refrigeration & Freezers': 'Jokofu na Vigandisha',

  'Kitchen Cooking & Ovens': 'Vifaa vya Kupikia Jikoni',

  'Home Cleaning & Laundry': 'Vifaa vya Kusafishia Nyumbani',

  'Audio & Headphones': 'Sauti na Vipaza Sauti',

  'Phones & Wearables': 'Simu na Vifaa vya Kuvaa',

  'Cameras, Drones & Optics': 'Kamera na Ndege zisizo na Rubani'

};



interface SortableImageItemProps {
  id: string;
  img: string;
  idx: number;
  totalImages?: number;
  onRemove: (index: number) => void;
  onMoveLeft?: (index: number) => void;
  onMoveRight?: (index: number) => void;
  onSetAsMain?: (img: string, index: number) => void;
  onPreview?: (img: string) => void;
  isDark: boolean;
}

const SortableImageItem: React.FC<SortableImageItemProps> = ({ id, img, idx, totalImages = 1, onRemove, onSetAsMain, onPreview, isDark }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.42 : undefined,
  };

  const isPrimary = idx === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-square overflow-hidden rounded-[1.35rem] border bg-white p-1.5 shadow-sm transition-all duration-200 touch-none select-none dark:bg-slate-900 ${
        isDragging
          ? 'scale-[1.04] border-blue-500 shadow-2xl ring-4 ring-blue-500/25'
          : isDark
            ? 'border-slate-800 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-xl'
            : 'border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-xl'
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={`Drag gallery image ${idx + 1} to reorder`}
        className="relative flex h-full w-full cursor-grab items-center justify-center overflow-hidden rounded-[1rem] bg-[radial-gradient(circle_at_50%_35%,rgba(148,163,184,0.10),transparent_60%)] active:cursor-grabbing"
      >
        <img
          src={img}
          alt={`Gallery image ${idx + 1}`}
          className={`h-full w-full rounded-[0.85rem] object-contain transition-transform duration-300 ${isDragging ? 'scale-105' : 'group-hover:scale-[1.025]'}`}
          loading="lazy"
        />

        {/* Persistent visual affordances — no hover-only instruction overlay. */}
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between">
          <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/75 px-2 py-1 text-[10px] font-black text-white shadow-lg backdrop-blur-md">
            <GripVertical className="h-3 w-3 text-blue-300" />
            <span>{idx + 1}</span>
          </div>
          {isPrimary && (
            <div className="flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-400 px-2 py-1 text-[9px] font-black text-slate-950 shadow-lg">
              <Star className="h-3 w-3 fill-slate-950" />
              MAIN
            </div>
          )}
        </div>

        {/* Compact controls remain visible so the editor never depends on mouse-over labels. */}
        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1 opacity-100">
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/70 p-1 shadow-lg backdrop-blur-md">
            {onPreview && (
              <button
                type="button"
                aria-label="Preview image"
                onClick={(e) => { e.stopPropagation(); onPreview(img); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white transition hover:bg-blue-600 active:scale-95"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            )}
            {onSetAsMain && !isPrimary && (
              <button
                type="button"
                aria-label="Set image as main cover"
                onClick={(e) => { e.stopPropagation(); onSetAsMain(img, idx); }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-amber-300 transition hover:bg-amber-400 hover:text-slate-950 active:scale-95"
              >
                <Star className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            aria-label="Remove image from gallery"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(idx); }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-300/30 bg-rose-600 text-white shadow-lg transition hover:scale-105 hover:bg-rose-500 active:scale-90"
          >
            <X className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      

    </div>
  );
};

interface HeroImageDropzoneProps {

  formImage: string;

  activeDragImage: string | null;

  isUploading: boolean;

  onImageChange: (url: string) => void;

  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;

  onSwapWithFirstGallery?: () => void;

  hasGalleryImages: boolean;

  isDark: boolean;

  inputBg: string;

  textSub: string;

  onPreview?: (url: string) => void;

}



const HeroImageDropzone: React.FC<HeroImageDropzoneProps> = ({

  formImage,

  activeDragImage,

  isUploading,

  onImageChange,

  onFileUpload,

  onSwapWithFirstGallery,

  hasGalleryImages,

  isDark,

  inputBg,

  textSub,

  onPreview,

}) => {

  const { setNodeRef, isOver } = useDroppable({

    id: 'main-hero-dropzone',

  });



  const [isDesktopDraggingOver, setIsDesktopDraggingOver] = useState(false);



  const handleDragOver = (e: React.DragEvent) => {

    e.preventDefault();

    e.stopPropagation();

    setIsDesktopDraggingOver(true);

  };



  const handleDragLeave = (e: React.DragEvent) => {

    e.preventDefault();

    e.stopPropagation();

    setIsDesktopDraggingOver(false);

  };



  const handleDrop = async (e: React.DragEvent) => {

    e.preventDefault();

    e.stopPropagation();

    setIsDesktopDraggingOver(false);

    const files = e.dataTransfer.files;

    if (files && files.length > 0) {

      const file = files[0];

      try {

        const url = await processAndUploadImage(file, formImage);

        onImageChange(url);

      } catch (err: any) {

        console.error('Failed to upload hero image via drag-drop:', err);

      }

    }

  };



  const isHighlighted = !!activeDragImage;



  return (

    <div

      ref={setNodeRef}

      onDragOver={handleDragOver}

      onDragLeave={handleDragLeave}

      onDrop={handleDrop}

      className={`relative rounded-3xl border-2 transition-all p-4 ${

        isOver

          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-4 ring-emerald-500/30 scale-[1.01] shadow-xl'

          : isDesktopDraggingOver

            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-4 ring-blue-500/30'

            : isHighlighted

              ? 'border-amber-400 dark:border-amber-500/80 bg-amber-50/30 dark:bg-amber-950/20 border-dashed animate-pulse shadow-md'

              : isDark

                ? 'border-slate-800 bg-slate-900/60'

                : 'border-slate-200 bg-slate-50/80'

      }`}

    >

      {/* Header Bar with Status */}

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">

        <div className="flex items-center gap-2">

          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider">

            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />

            <span>Primary Front Cover (Main)</span>

          </span>

          <span className="text-[11px] text-slate-400 hidden sm:inline-block">

            Displayed on Storefront Cards & Catalog

          </span>

        </div>



        {hasGalleryImages && onSwapWithFirstGallery && (

          <button

            type="button"

            onClick={onSwapWithFirstGallery}

            className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 transition-all"

            

          >

            <ArrowLeftRight className="w-3 h-3" />

            <span>Swap with Gallery #1</span>

          </button>

        )}

      </div>



      {/* Main Image Stage & Droppable Surface */}

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">

        {/* Visual Box */}

        <div className="sm:col-span-4 relative aspect-[4/3] rounded-[1.5rem] border-2 border-slate-200/80 bg-white p-2 overflow-hidden flex items-center justify-center group shadow-inner transition-all duration-200 dark:border-slate-700 dark:bg-slate-950">

          {formImage ? (
            <img
              src={formImage}
              alt="Main Front Cover"
              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-center text-slate-400">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-500">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">Drop cover image</span>
              </div>
          )}



          {/* Top-Right Quick Action Buttons (Enlarge Preview & X Clear Button) */}
          {formImage && (
            <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
              {onPreview && (
                <button
                  type="button"
                  onClick={() => onPreview(formImage)}
                  className="p-1.5 rounded-xl bg-slate-950/70 hover:bg-blue-600 text-white transition-all backdrop-blur-sm shadow-md"
                  
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onImageChange('')}
                className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xl border border-rose-400/30 flex items-center justify-center transition-all hover:scale-110 active:scale-90"
                
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          )}



          {/* Dragging Active Overlay for dropping gallery image */}

          {isHighlighted && (

            <div className={`absolute inset-0 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center transition-all ${

              isOver 

                ? 'bg-emerald-600/90 text-white' 

                : 'bg-amber-500/90 text-slate-950'

            }`}>

              {isOver ? (

                <>

                  <CheckCircle className="w-8 h-8 animate-bounce mb-1 text-white" />

                  <span className="text-xs font-black uppercase tracking-wider">Release to Set as Front Cover!</span>

                </>

              ) : (

                <>

                  <Star className="w-7 h-7 animate-pulse mb-1 fill-slate-950 text-slate-950" />

                  <span className="text-xs font-black uppercase tracking-wider">Drop Here to Set as Front Cover</span>

                </>

              )}

            </div>

          )}



          {/* Uploading Progress Overlay */}

          {isUploading && (

            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-2">

              <RefreshCw className="w-7 h-7 text-blue-400 animate-spin mb-1" />

              <span className="text-[11px] font-bold text-white">Uploading Image...</span>

            </div>

          )}

        </div>



        {/* Action Controls & Input URL */}

        <div className="sm:col-span-8 space-y-2.5">

          <div className="flex flex-wrap items-center gap-2">

            <label className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border flex items-center gap-2 shadow-sm ${

              isDark 

                ? 'bg-blue-600 hover:bg-blue-500 border-blue-500 text-white' 

                : 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white'

            }`}>

              <UploadCloud className="w-4 h-4" />

              <span>{isUploading ? 'Uploading...' : 'Upload New Front Image'}</span>

              <input

                type="file"

                accept="image/*"

                className="hidden"

                onChange={onFileUpload}

                disabled={isUploading}

              />

            </label>



            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-500/15 bg-blue-500/10 text-blue-500" aria-hidden="true">
              <Move className="h-4 w-4" />
            </span>

          </div>



          <div className="relative">

            <Link className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

            <input

              type="text"

              required

              value={formImage}

              onChange={(e) => onImageChange(e.target.value)}

              placeholder="https://images.unsplash.com/... or storage link"

              className={`w-full pl-9 pr-3.5 py-2 text-xs font-mono rounded-xl ${inputBg}`}

            />

          </div>



          <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">

            Tip: Drag any gallery photo directly onto this box to instantly switch your primary product cover photo.

          </p>

        </div>

      </div>

    </div>

  );

};





interface AdminPortalProps {

  user?: any;

  profile?: any;

  onSwitchToClient?: () => void;

  onLogout?: () => void;

  categories?: CategoryItem[];

  addCategory?: (category: Omit<CategoryItem, 'id'>) => void;

  updateCategory?: (category: CategoryItem) => void;

  deleteCategory?: (id: string) => void;

  clearCategories?: () => Promise<any> | void;

  products: Product[];

  addProduct: (product: Omit<Product, 'id'>) => void;

  updateProduct: (product: Product) => void;

  deleteProduct: (productId: string) => void;

  clearProducts?: () => Promise<any> | void;

  orders: Order[];

  updateOrderStatus: (orderId: string, status: Order['status']) => void;

  updateOrder?: (order: Order) => void;

  deleteOrder?: (orderId: string) => Promise<any> | void;

  clearOrders?: () => Promise<any> | void;

  posTransactions: POSTransaction[];

  addPOSTransaction: (transaction: POSTransaction) => Promise<any> | void;
  updatePOSTransaction?: (transaction: POSTransaction) => Promise<any> | void;

  /** Prefer a backend/database transaction that validates stock, decrements inventory,
   * creates the POS transaction and commits atomically. The UI fallback below remains
   * available for existing callers that have not wired this hook yet. */
  completePOSTransaction?: (transaction: POSTransaction) => Promise<any> | void;

  deletePOSTransaction?: (txId: string) => Promise<any> | void;

  clearPOSTransactions?: () => Promise<any> | void;

  staff: Staff[];

  addStaff?: (staffData: Omit<Staff, 'id' | 'createdAt'> & { password?: string }) => Promise<any> | void;

  updateStaff?: (staff: Staff) => Promise<any> | void;

  deleteStaff?: (staffId: string) => Promise<any> | void;

  clearStaff?: () => Promise<any> | void;

  resetStaffPassword?: (staffId: string, newPassword?: string) => Promise<any> | void;

  profiles?: UserProfile[];

  updateCustomerProfile?: (profile: UserProfile) => Promise<any> | void;

  resetCustomerPassword?: (customerId: string, newPassword?: string, email?: string) => Promise<any> | void;

  deleteCustomer?: (customerId: string, email?: string) => Promise<any> | void;

  deleteUser?: (userId: string, email?: string) => Promise<any> | void;

  clearProfiles?: () => Promise<any> | void;

  theme?: 'dark' | 'light';

  adminThemeMode?: 'system' | 'dark' | 'light';

  onToggleTheme?: () => void;

  onSetAdminThemeMode?: (mode: 'system' | 'dark' | 'light') => void;

  storeSettings?: StoreSettings;

  onUpdateStoreSettings?: (settings: StoreSettings) => Promise<void> | void;

}



export const deleteStorageImage = async (imageUrl?: string | string[] | null) => {

  if (!imageUrl) return;

  const rawList = Array.isArray(imageUrl) ? imageUrl : [imageUrl];

  const urls = rawList.filter((u): u is string => typeof u === 'string' && u.trim().length > 0 && (u.includes('genuine_electronics') || u.includes('/storage/v1/object/')));

  if (urls.length === 0) return;

  try {

    await fetch('/api/upload/delete', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ urls }),

    });

  } catch (e) {

    console.warn('Failed to request deletion of previous image:', e);

  }

};



export const compressAndResizeImage = (file: File, maxDim = 1600, quality = 0.85): Promise<string> => {

  return new Promise((resolve, reject) => {

    if (file.size > 20 * 1024 * 1024) {

      return reject(new Error('File size exceeds maximum 20MB limit.'));

    }

    const outputFormat = 'image/webp';



    const reader = new FileReader();

    reader.onload = (event) => {

      const img = new Image();

      img.onload = () => {

        let width = img.width;

        let height = img.height;

        if (width > maxDim || height > maxDim) {

          if (width > height) {

            height = Math.round((height * maxDim) / width);

            width = maxDim;

          } else {

            width = Math.round((width * maxDim) / height);

            height = maxDim;

          }

        }

        const canvas = document.createElement('canvas');

        canvas.width = width;

        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: true });

        if (ctx) {

          ctx.clearRect(0, 0, width, height);

          ctx.drawImage(img, 0, 0, width, height);

          try {

            const dataUrl = canvas.toDataURL(outputFormat, quality);

            // Verify webp output supported, otherwise standard png/jpeg

            if (dataUrl.startsWith('data:image/webp')) {

              resolve(dataUrl);

            } else {

              resolve(canvas.toDataURL('image/jpeg', quality));

            }

          } catch {

            resolve((event.target?.result as string) || '');

          }

        } else {

          resolve((event.target?.result as string) || '');

        }

      };

      img.onerror = () => resolve((event.target?.result as string) || '');

      img.src = (event.target?.result as string) || '';

    };

    reader.onerror = (err) => reject(err);

    reader.readAsDataURL(file);

  });

};



export const compressImageToBlob = (file: File, maxDim = 1600, quality = 0.85): Promise<{ blob: Blob; format: string }> => {

  return new Promise((resolve, reject) => {

    if (file.size > 20 * 1024 * 1024) {

      return reject(new Error('File size exceeds maximum 20MB limit.'));

    }



    const reader = new FileReader();

    reader.onload = (event) => {

      const img = new Image();

      img.onload = () => {

        let width = img.width;

        let height = img.height;

        if (width > maxDim || height > maxDim) {

          if (width > height) {

            height = Math.round((height * maxDim) / width);

            width = maxDim;

          } else {

            width = Math.round((width * maxDim) / height);

            height = maxDim;

          }

        }

        const canvas = document.createElement('canvas');

        canvas.width = width;

        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: true });

        if (ctx) {

          ctx.clearRect(0, 0, width, height);

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(

            (blob) => {

              if (blob) {

                resolve({ blob, format: 'image/webp' });

              } else {

                canvas.toBlob(

                  (fallbackBlob) => {

                    if (fallbackBlob) resolve({ blob: fallbackBlob, format: 'image/jpeg' });

                    else reject(new Error('Canvas image conversion failed'));

                  },

                  'image/jpeg',

                  quality

                );

              }

            },

            'image/webp',

            quality

          );

        } else {

          reject(new Error('Canvas context unavailable'));

        }

      };

      img.onerror = (err) => reject(err);

      img.src = (event.target?.result as string) || '';

    };

    reader.onerror = (err) => reject(err);

    reader.readAsDataURL(file);

  });

};



export const processAndUploadImage = async (

  file: File,

  _previousUrl?: string

): Promise<string> => {

  if (file.size > 20 * 1024 * 1024) {

    throw new Error('Image exceeds 20MB limit. Please choose an image under 20MB.');

  }

  // IMPORTANT: Do not delete the previous object here. Uploading can fail, and deleting
  // the old object first can leave the database pointing at a missing image. Callers
  // delete replaced objects only after their database/state update succeeds.
  const { blob } = await compressImageToBlob(file);

  const compressedFile = new File(

    [blob],

    file.name.replace(/\.[^/.]+$/, '.webp'),

    { type: 'image/webp' }

  );

  if (!navigator.onLine) {
    throw new Error('Image upload requires an online connection so the image can be stored in cloud storage.');
  }

  const formData = new FormData();

  formData.append('file', compressedFile);

  try {

    const response = await fetch('/api/upload', {

      method: 'POST',

      body: formData,

    });

    const text = await response.text();

    let data: any = {};

    try {

      data = JSON.parse(text);

    } catch {

      throw new Error('Upload server returned an invalid response.');

    }

    if (response.ok && typeof data.url === 'string' && data.url.trim()) {

      return data.url;

    }

    throw new Error(data.error || `Image upload failed (${response.status}).`);

  } catch (err: any) {

    // Never persist a base64/data URI as an image URL. A failed upload must
    // remain an explicit upload error rather than embedding binary data in
    // application state/database records.
    console.warn('Cloud image upload failed:', err);
    throw new Error(err?.message || 'Image upload failed. Please check storage configuration and try again.');

  }

};


export const AdminPortal: React.FC<AdminPortalProps> = ({

  user,

  profile,

  onSwitchToClient,

  onLogout,

  categories = [],

  addCategory,

  updateCategory,

  deleteCategory,

  clearCategories,

  products,

  addProduct,

  updateProduct,

  deleteProduct,

  clearProducts,

  orders,

  updateOrderStatus,

  updateOrder,

  deleteOrder,

  clearOrders,

  posTransactions,

  addPOSTransaction,
  updatePOSTransaction,
  completePOSTransaction,

  deletePOSTransaction,

  clearPOSTransactions,

  staff,

  addStaff,

  updateStaff,

  deleteStaff,

  clearStaff,

  resetStaffPassword,

  profiles = [],

  updateCustomerProfile,

  resetCustomerPassword,

  deleteCustomer,

  deleteUser,

  clearProfiles,

  theme = 'dark',

  adminThemeMode = 'system',

  onToggleTheme,

  onSetAdminThemeMode,

  storeSettings,

  onUpdateStoreSettings,

}) => {

  const [activeTab, setActiveTab] = useState<'dashboard' | 'visitor-analytics' | 'inventory' | 'pos' | 'orders' | 'pos-sales' | 'loans' | 'debt-analytics' | 'staff' | 'customers' | 'offers' | 'settings' | 'audit-logs'>('dashboard');
  const [posSubTab, setPosSubTab] = useState<'register' | 'loans' | 'history' | 'debt-analytics'>('register');

  const isPosActive = activeTab === 'pos' || activeTab === 'pos-sales' || activeTab === 'loans' || activeTab === 'debt-analytics';
  const [isPosSubmenuOpen, setIsPosSubmenuOpen] = useState(isPosActive);

  const totalLoansCount = useMemo(() => {
    const posLoans = (posTransactions || []).filter(tx => isLoanTransaction(tx)).length;
    const orderLoans = (orders || []).filter(ord => isLoanTransaction(ord as any)).length;
    return posLoans + orderLoans;
  }, [posTransactions, orders]);

  // Auto show POS submenus when POS is active, auto hide when user navigates away
  useEffect(() => {
    setIsPosSubmenuOpen(isPosActive);
  }, [isPosActive]);

  const [chartTimeframe, setChartTimeframe] = useState<'daily' | 'weekly' | 'yearly'>('daily');

  const [posSearchQuery, setPosSearchQuery] = useState('');

  const [posPaymentMethodFilter, setPosPaymentMethodFilter] = useState('All');

  const [posDateFilter, setPosDateFilter] = useState("All Time");

  const [posCustomDate, setPosCustomDate] = useState("");



  // Keyboard Shortcuts & Command Palette States

  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const [activeCloudOperations, setActiveCloudOperations] = useState<number>(0);
  const [cloudOpDetails, setCloudOpDetails] = useState<{ tableName?: string; action?: string; message?: string } | null>(null);

  useEffect(() => {
    const handleStart = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail) {
        setCloudOpDetails(detail);
      }
      setActiveCloudOperations(prev => prev + 1);
    };
    const handleEnd = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (detail?.force) {
        setActiveCloudOperations(0);
        setCloudOpDetails(null);
        return;
      }
      setActiveCloudOperations(prev => {
        const next = Math.max(0, prev - 1);
        if (next === 0) setCloudOpDetails(null);
        return next;
      });
    };

    window.addEventListener('supabase-write-start', handleStart);
    window.addEventListener('supabase-write-end', handleEnd);

    return () => {
      window.removeEventListener('supabase-write-start', handleStart);
      window.removeEventListener('supabase-write-end', handleEnd);
    };
  }, []);

  const [shortcutFeedback, setShortcutFeedback] = useState<{ message: string; key: string } | null>(null);



  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);



  const triggerShortcutFeedback = (message: string, key: string) => {

    setShortcutFeedback({ message, key });

    setTimeout(() => {

      setShortcutFeedback(prev => (prev?.message === message ? null : prev));

    }, 2800);

  };



  // Custom Modal State for Alerts/Confirmations

  const [modalConfig, setModalConfig] = useState<{

    isOpen: boolean;

    type: 'alert' | 'confirm' | 'error' | 'warning' | 'password';

    title: string;

    message: string;

    onConfirm?: (value?: string) => void;

    onCancel?: () => void;

    confirmText?: string;

    cancelText?: string;

    inputValue?: string;

  }>({

    isOpen: false,

    type: 'alert',

    title: '',

    message: '',

  });



  const showAlert = (title: string, message: string, type: 'alert' | 'error' | 'warning' = 'alert') => {

    setModalConfig({

      isOpen: true,

      type,

      title,

      message,

      confirmText: 'Dismiss'

    });

  };



  const showConfirm = (title: string, message: string, onConfirm: () => void, type: 'confirm' | 'warning' = 'confirm') => {

    setModalConfig({

      isOpen: true,

      type,

      title,

      message,

      onConfirm,

      confirmText: 'Confirm',

      cancelText: 'Cancel'

    });

  };



  const showPasswordConfirm = (title: string, message: string, onConfirm: (pass: string) => void) => {

    setModalConfig({

      isOpen: true,

      type: 'password',

      title,

      message,

      onConfirm,

      confirmText: 'Verify & Proceed',

      cancelText: 'Cancel',

      inputValue: ''

    });

  };



  // Dispatch & Order Tracking Modal State

  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  const handleBulkShare = async () => {
    const productsToShare = products.filter(p => selectedProductIds.has(p.id));
    if (productsToShare.length === 0) return;

    if (productsToShare.length === 1) {
      await shareProduct({...productsToShare[0], image: productsToShare[0].image});
    } else {
      const textToCopy = productsToShare.map(p => `${p.name}: ${window.location.origin}/product/${p.id}`).join('\n');
      try {
        await navigator.clipboard.writeText(textToCopy);
        alert('All links copied to clipboard!');
      } catch (err) {
        console.error('Error copying to clipboard:', err);
      }
    }
  };

  const handleBulkDelete = () => {
    showConfirm(
      'Bulk Delete Products',
      `Are you sure you want to delete ${selectedProductIds.size} selected products? This action cannot be undone.`,
      () => {
        const confirmationString = `Delete All ${selectedProductIds.size}`;
        setTimeout(() => {
          showPasswordConfirm(
            'Confirm Deletion',
            `Type "${confirmationString}" to permanently delete these ${selectedProductIds.size} products.`,
            async (pass: string) => {
              if (pass !== confirmationString) {
                alert('Confirmation string does not match.');
                return;
              }
              const productsToDelete = products.filter(p => selectedProductIds.has(p.id));
              for (const p of productsToDelete) {
                 await deleteStorageImage([p.image, ...(p.images || [])]);
                 deleteProduct(p.id);
              }
              setSelectedProductIds(new Set());
            }
          );
        }, 150);
      },
      'warning'
    );
  };

  // Bulk Stock Adjuster Modal State
  const [isBulkStockModalOpen, setIsBulkStockModalOpen] = useState(false);
  const [bulkStockAction, setBulkStockAction] = useState<'add' | 'subtract' | 'set'>('add');
  const [bulkStockQuantity, setBulkStockQuantity] = useState<number>(5);
  const [isBulkStockProcessing, setIsBulkStockProcessing] = useState(false);

  const handleBulkStockSubmit = async () => {
    if (selectedProductIds.size === 0) return;
    setIsBulkStockProcessing(true);
    triggerHaptic('medium');
    try {
      const selectedList = products.filter(p => selectedProductIds.has(p.id));
      for (const p of selectedList) {
        let newStock = Number(p.stock || 0);
        if (bulkStockAction === 'add') {
          newStock = Math.max(0, newStock + Number(bulkStockQuantity));
        } else if (bulkStockAction === 'subtract') {
          newStock = Math.max(0, newStock - Number(bulkStockQuantity));
        } else if (bulkStockAction === 'set') {
          newStock = Math.max(0, Number(bulkStockQuantity));
        }
        await updateProduct({ ...p, stock: newStock });
      }
      triggerHaptic('success');
      showAlert('Stock Adjusted', `Successfully updated stock levels for ${selectedList.length} items.`);
      setIsBulkStockModalOpen(false);
    } catch (err) {
      triggerHaptic('error');
      showAlert('Stock Adjustment Failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsBulkStockProcessing(false);
    }
  };

  const handleQuickStockDelta = async (product: Product, delta: number) => {
    const current = Number(product.stock || 0);
    const updated = Math.max(0, current + delta);
    triggerHaptic('light');
    try {
      await updateProduct({ ...product, stock: updated });
    } catch (err) {
      console.error('Failed to quick adjust stock:', err);
    }
  };

  const handleSetExactStock = async (product: Product, exactStock: number) => {
    const valid = Math.max(0, exactStock);
    triggerHaptic('light');
    try {
      await updateProduct({ ...product, stock: valid });
    } catch (err) {
      console.error('Failed to set stock:', err);
    }
  };

  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<Order | null>(null);

  const [dispatchStatus, setDispatchStatus] = useState<Order['status']>('Processing');

  const [dispatchTrackingNumber, setDispatchTrackingNumber] = useState('');

  const [dispatchCourier, setDispatchCourier] = useState('DAR Express (Local)');

  const [dispatchEstimatedDelivery, setDispatchEstimatedDelivery] = useState('');

  const [dispatchNotes, setDispatchNotes] = useState('');

  const [dispatchPaidAmount, setDispatchPaidAmount] = useState<number>(0);

  const [dispatchPaymentStatus, setDispatchPaymentStatus] = useState<'Pending' | 'Partial' | 'Paid' | 'Failed'>('Pending');



  // Staff Management State

  const [staffSearchQuery, setStaffSearchQuery] = useState('');

  const [staffRoleFilter, setStaffRoleFilter] = useState('All');

  const [staffStatusFilter, setStaffStatusFilter] = useState('All');

  const [staffViewMode, setStaffViewMode] = useState<'grid' | 'table'>('grid');

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  const [editingStaffMember, setEditingStaffMember] = useState<Staff | null>(null);

  const [viewingStaffProfile, setViewingStaffProfile] = useState<Staff | null>(null);

  const [resetPasswordStaff, setResetPasswordStaff] = useState<Staff | null>(null);

  const [newStaffPasswordInput, setNewStaffPasswordInput] = useState('');

  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  const [staffAvatarUploading, setStaffAvatarUploading] = useState(false);

  const [staffForm, setStaffForm] = useState({

    name: '',

    email: '',

    phone: '',

    role: 'Cashier / POS Associate',

    password: '',

    permissions: ['POS_ACCESS', 'VIEW_CATALOG'] as string[],

    status: 'Active' as 'Active' | 'Inactive',

    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'

  });



  // Customer CRM State

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  const [customerTierFilter, setCustomerTierFilter] = useState('All');

  const [customerSortBy, setCustomerSortBy] = useState<'lifetimeValue' | 'totalOrders' | 'lastOrder' | 'name'>('lifetimeValue');

  const [selectedCustomerForCrm, setSelectedCustomerForCrm] = useState<(CustomerProfile & { ordersList: Order[] }) | null>(null);

  const [resetPasswordCustomer, setResetPasswordCustomer] = useState<CustomerProfile | null>(null);

  const [newCustomerPasswordInput, setNewCustomerPasswordInput] = useState('');

  const [customerResetSuccessMessage, setCustomerResetSuccessMessage] = useState<string | null>(null);

  const [customerOrderFilter, setCustomerOrderFilter] = useState<'all' | Order['status']>('all');

  const [editingCustomerNotes, setEditingCustomerNotes] = useState<{ id: string; notes: string; phone: string; address: string } | null>(null);

  const [crmToast, setCrmToast] = useState<string | null>(null);

  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  // Clear unread count when viewing orders
  useEffect(() => {
    if (activeTab === 'orders') {
      setUnreadCount(0);
    }
  }, [activeTab]);

  // Real-time listener for New Orders via SSE
  useEffect(() => {
    const handleLiveEvent = (e: any) => {
      const payload = e.detail;
      if (
        payload &&
        payload.type === 'COLLECTION_UPDATE' &&
        (payload.collection === 'orders' || payload.collection === 'Orders') &&
        payload.action === 'ADD'
      ) {
        const newOrder = payload.item;
        if (newOrder) {
          setNewOrderAlert(newOrder);
          
          setUnreadCount(prev => prev + 1);
          
          triggerHaptic('success');
          
          // Modern bell notification sound
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(err => console.warn('Audio play failed:', err));
          
          // Auto dismiss after 15s
          setTimeout(() => setNewOrderAlert(null), 15000);
        }
      }
    };
    
    window.addEventListener('cloud-live-event', handleLiveEvent);
    return () => window.removeEventListener('cloud-live-event', handleLiveEvent);
  }, []);

  // Dashboard Visitor Analytics & Activity Heatmap State
  const [dashboardVisitorSummary, setDashboardVisitorSummary] = useState<VisitorAnalyticsSummary | null>(null);
  const [heatmapTimeframe, setHeatmapTimeframe] = useState<'today' | '7days' | '30days' | '60days'>('30days');

  useEffect(() => {
    let isMounted = true;
    fetchVisitorSummary(heatmapTimeframe)
      .then(data => {
        if (isMounted) setDashboardVisitorSummary(data);
      })
      .catch(err => console.warn('Failed to load dashboard visitor summary:', err));
    return () => { isMounted = false; };
  }, [heatmapTimeframe, activeTab]);




  const [settingsForm, setSettingsForm] = useState<StoreSettings>(storeSettings || {

    storeName: 'Genuine Electronics',

    tagline: 'Authorized Consumer & Enterprise Technology Retailer',

    tin: '104-982-371',

    vrn: '40-029182-Z',

    address: 'Kariakoo / Ndanda na Masasi Street, Dar es Salaam Tanzania',

    phone: '+255 624 057 166',

    email: 'sales@genuine-electronics.com',

    bankName: 'CRDB Bank Tanzania PLC',

    bankAccount: '0150 8829 4100',

    bankSwift: 'CORUTZTZ',

    mobileMoneyNumber: '0624 057 166',

    mobileMoneyName: 'Genuine Electronics Ltd',

    whatsappNumber: '+255 624 057 166',

    announcementText: '🎉 Special Offer: Free Express Delivery across Dar es Salaam on orders over TZS 500,000!',

    showAnnouncement: true,

    heroBadge: 'Authorized Dealer • 100% Genuine Guarantee',

    heroTitle: 'Next-Gen Technology & Home Appliances in Tanzania',

    heroSubtitle: 'Shop top global brands with official local warranty, official receipts, and same-day delivery.',

    heroImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800',

    paymentMethods: []

  });



  // Offers & Discounts management states

  const [bulkCategory, setBulkCategory] = useState<string>('All');

  const [bulkPercentage, setBulkPercentage] = useState<number>(10);

  const [bulkDiscountFeedback, setBulkDiscountFeedback] = useState<string | null>(null);

  const [isApplyingBulk, setIsApplyingBulk] = useState<boolean>(false);

  const [discountsSearch, setDiscountsSearch] = useState<string>('');

  const [discountsFilter, setDiscountsFilter] = useState<'all' | 'active' | 'regular'>('all');

  

  const [selectedPOSCategory, setSelectedPOSCategory] = useState<string>('All');

  const [rateLimitStatus, setRateLimitStatus] = useState({ limited: false, retryAfter: 0 });



  // Mobile Navigation State

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);



  const [settingsFormDirty, setSettingsFormDirty] = useState(false);



  useEffect(() => {

    if (storeSettings) {

      const isModified = JSON.stringify(settingsForm) !== JSON.stringify(storeSettings);

      if (isModified !== settingsFormDirty) {

        setSettingsFormDirty(isModified);

      }

    }

  }, [settingsForm, storeSettings, settingsFormDirty]);



  useEffect(() => {

    if (storeSettings && !settingsFormDirty) {

      setSettingsForm(storeSettings);

    }

  }, [storeSettings, settingsFormDirty]);



  const [settingsSaved, setSettingsSaved] = useState(false);

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCleaningBrands, setIsCleaningBrands] = useState(false);

  const handleBrandCleanup = async () => {
    if (!confirm('This will standardize all product brands (e.g. converting "samsung electronics" to "Samsung", fixing casing). Proceed?')) return;
    setIsCleaningBrands(true);
    try {
      let updatedCount = 0;
      for (const p of products) {
        if (!p.brand) continue;
        const currentBrand = p.brand.trim();
        if (!currentBrand) continue;
        
        // Convert to Title Case
        let cleanBrand = currentBrand
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ')
          .trim();
          
        if (String(cleanBrand || "").toLowerCase().includes('samsung')) cleanBrand = 'Samsung';
        if (String(cleanBrand || "").toLowerCase().includes('apple')) cleanBrand = 'Apple';
        if (String(cleanBrand || "").toLowerCase().includes('sony')) cleanBrand = 'Sony';
        if (String(cleanBrand || "").toLowerCase().includes('hisense')) cleanBrand = 'Hisense';
        if (String(cleanBrand || "").toLowerCase().includes('tcl')) cleanBrand = 'TCL';
        if (String(cleanBrand || "").toLowerCase().includes('lg')) cleanBrand = 'LG';
        if (String(cleanBrand || "").toLowerCase().includes('tecno')) cleanBrand = 'Tecno';
        if (String(cleanBrand || "").toLowerCase().includes('infinix')) cleanBrand = 'Infinix';
        if (String(cleanBrand || "").toLowerCase().includes('itel')) cleanBrand = 'Itel';

        if (p.brand !== cleanBrand) {
          await updateProduct({ ...p, brand: cleanBrand });
          updatedCount++;
        }
      }
      showAlert('Brands Standardized', `Successfully cleaned up ${updatedCount} product brand tags across the catalog.`);
    } catch (err: any) {
      showAlert('Brand Cleanup Error', err.message || 'Failed to clean product brands', 'error');
    } finally {
      setIsCleaningBrands(false);
    }
  };



  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureOnline('save store settings')) return;
    setIsSavingSettings(true);

    try {

      const previousSettings = storeSettings;

      if (onUpdateStoreSettings) {

        await onUpdateStoreSettings(settingsForm);

      }

      // Delete replaced cloud assets only after the settings write succeeds.
      const replacedAssets = [previousSettings?.heroImage, previousSettings?.logoUrl]
        .filter((url): url is string => Boolean(url))
        .filter(url => ![settingsForm.heroImage, settingsForm.logoUrl].includes(url));

      if (replacedAssets.length > 0) {

        await deleteStorageImage([...new Set(replacedAssets)]);

      }

      setSettingsFormDirty(false);

      setSettingsSaved(true);

      setTimeout(() => setSettingsSaved(false), 3500);

    } catch (err) {

      console.error('Failed to save settings:', err);

      showAlert('Settings Save Failed', err instanceof Error ? err.message : 'Failed to save store settings.', 'error');

    } finally {

      setIsSavingSettings(false);

    }

  };



  // Close mobile menu when tab changes

  useEffect(() => {

    setIsMobileMenuOpen(false);

  }, [activeTab]);



  // Track rate limit status

  useEffect(() => {

    const interval = setInterval(() => {

      setRateLimitStatus(getRateLimitStatus());

    }, 1000);

    return () => clearInterval(interval);

  }, []);







  const handleApplyBulkDiscount = async () => {

    if (!products || products.length === 0) return;

    setIsApplyingBulk(true);

    setBulkDiscountFeedback(null);

    const percentage = Math.min(100, Math.max(0, Number(bulkPercentage) || 0));

    if (percentage <= 0) {
      setBulkDiscountFeedback('Enter a discount percentage greater than 0%.');
      setIsApplyingBulk(false);
      return;
    }

    try {

      let count = 0;

      for (const prod of products) {

        if (bulkCategory === 'All' || prod.category === bulkCategory) {

          const basePrice = prod.originalPrice && prod.originalPrice > prod.price 

            ? Number(prod.originalPrice) 

            : Number(prod.price);

          

          const discountAmt = basePrice * (percentage / 100);

          const newPrice = Math.round(basePrice - discountAmt);

          

          await updateProduct({

            ...prod,

            price: newPrice,

            originalPrice: basePrice,

            isOnOffer: true,

            offerTitle: `${percentage}% OFF`

          });

          count++;

        }

      }

      setBulkDiscountFeedback(`Successfully applied a ${percentage}% bulk discount to ${count} products under "${bulkCategory}"!`);

      setTimeout(() => setBulkDiscountFeedback(null), 5000);

    } catch (err) {

      console.error('Failed to apply bulk discount:', err);

      setBulkDiscountFeedback('An error occurred while applying bulk discounts.');

    } finally {

      setIsApplyingBulk(false);

    }

  };



  const offerStats = React.useMemo(() => {
    const live = products.filter(p => p.isOnOffer || (Number(p.originalPrice || 0) > Number(p.price || 0)));
    const regular = Math.max(0, products.length - live.length);
    const totalMarkdownValue = live.reduce((sum, p) => {
      const original = Number(p.originalPrice || p.price || 0);
      const current = Number(p.price || 0);
      return sum + Math.max(0, original - current);
    }, 0);
    const averageMarkdown = live.length > 0
      ? live.reduce((sum, p) => {
          const original = Number(p.originalPrice || 0);
          return sum + (original > Number(p.price || 0) ? ((original - Number(p.price || 0)) / original) * 100 : 0);
        }, 0) / live.length
      : 0;
    const featured = products.filter(p => p.isOnOffer && p.featured).length;
    return { live: live.length, regular, totalMarkdownValue, averageMarkdown, featured };
  }, [products]);

  const isDark = theme === 'dark';



  // Theme-aware Style Tokens

  const cardBg = isDark ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-sm' : 'bg-white border-slate-200 text-slate-900 shadow-sm';

  const tableHeaderBg = isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500';

  const tableRowHover = isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-50';

  const textTitle = isDark ? 'text-white' : 'text-slate-900';

  const textSub = isDark ? 'text-slate-400' : 'text-slate-500';

  const inputBg = isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:ring-blue-500/50 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:ring-blue-600/30 focus:border-blue-600';

  const modalBg = isDark ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl' : 'bg-white border-slate-200 text-slate-900 shadow-xl';



  // Supabase Cloud Diagnostics & Sync State
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string; details?: string } | null>(null);

  // Cloud Sync Real-time Hook
  const { 
    notification: syncNotification, 
    clearNotification: clearSyncNotification 
  } = useSupabaseSyncStatus();



  // Form saving states

  const [isSavingProduct, setIsSavingProduct] = useState(false);

  const [productFormError, setProductFormError] = useState<string | null>(null);

  const [isSavingCategory, setIsSavingCategory] = useState(false);

  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);



  const checkSupabaseHealth = async () => {

    setIsCheckingSupabase(true);

    try {

      const status = await fetchSupabaseStatus();

      setSupabaseStatus(status);

    } catch (e: any) {

      setSupabaseStatus({ connected: false, configured: false, message: e?.message });

    } finally {

      setIsCheckingSupabase(false);

    }

  };



  useEffect(() => {
    if (activeTab === 'settings') {
      checkSupabaseHealth();
    }
  }, [activeTab]);

  const ensureOnline = (actionName = 'this action'): boolean => {
    if (!navigator.onLine) {
      showAlert(
        'Internet Connection Required',
        `No internet connection detected. An active network connection is required to ${actionName}. Please check your connection and try again.`,
        'warning'
      );
      return false;
    }
    return true;
  };



  // Inventory Modal State

  const [inventorySubTab, setInventorySubTab] = useState<'products' | 'categories'>('products');

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  const [previewingCategory, setPreviewingCategory] = useState<CategoryItem | null>(null);

  const [categoryForm, setCategoryForm] = useState<Partial<CategoryItem>>({});

  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  const [categoryViewMode, setCategoryViewMode] = useState<'grid' | 'table'>('grid');

  const [categoryImageInputMode, setCategoryImageInputMode] = useState<'upload' | 'url'>('upload');

  const [isCategoryReorderModalOpen, setIsCategoryReorderModalOpen] = useState(false);

  const [draggedCatId, setDraggedCatId] = useState<string | null>(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);



  // Form fields for product

  const [formName, setFormName] = useState('');

  const [formCategory, setFormCategory] = useState<Category>(() => {

    if (categories && categories.length > 0) {

      const sorted = [...categories].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

      return sorted[0]?.name || 'Smartphones';

    }

    return '';

  });



  useEffect(() => {

    if (categories && categories.length > 0 && !formCategory) {

      const sorted = [...categories].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

      if (sorted[0]?.name) {

        setFormCategory(sorted[0].name);

      }

    }

  }, [categories, formCategory]);



  const [formBrand, setFormBrand] = useState('');

  // Collect all unique existing brands from products and categories for smart auto-fill & quick chips
  const existingBrands = useMemo(() => {
    const brandMap = new Map<string, number>();
    (products || []).forEach(p => {
      if (p.brand && p.brand.trim()) {
        const clean = p.brand.trim();
        brandMap.set(clean, (brandMap.get(clean) || 0) + 1);
      }
    });
    // Add popular default brands if list is small
    ['Samsung', 'LG', 'Sony', 'Apple', 'Hisense', 'TCL', 'Bosch', 'Panasonic', 'Philips', 'Dell', 'HP', 'Lenovo', 'Xiaomi', 'Huawei', 'Nokia'].forEach(b => {
      if (!brandMap.has(b)) {
        brandMap.set(b, 0);
      }
    });
    return Array.from(brandMap.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(entry => entry[0]);
  }, [products]);

  // Auto-detect brand from product name typing if brand is empty or user hasn't explicitly locked it
  const handleProductNameChangeWithBrandDetection = (nameValue: string) => {
    setFormName(nameValue);
    // If brand is empty or matches a recognized brand prefix, detect matching existing brand
    if (!formBrand || formBrand.trim() === '') {
      const lowerName = (nameValue || '').toLowerCase();
      const detected = existingBrands.find(b => {
        if (!b) return false;
        const bLower = String(b).toLowerCase();
        if (!bLower) return false;
        try {
          const escaped = bLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escaped}\\b`, 'i');
          return regex.test(lowerName);
        } catch {
          return lowerName.includes(bLower);
        }
      });
      if (detected) {
        setFormBrand(detected);
      }
    }
  };

  const [formPrice, setFormPrice] = useState<number>(0);

  const [formCostPrice, setFormCostPrice] = useState<number>(0);

  const [formOriginalPrice, setFormOriginalPrice] = useState<number>(0);

  const [formWholesalePrice, setFormWholesalePrice] = useState<number>(0);

  const [formIsOnOffer, setFormIsOnOffer] = useState<boolean>(false);

  const [formIsVatInclusive, setFormIsVatInclusive] = useState<boolean>(true);

  const [formOfferEndsAt, setFormOfferEndsAt] = useState<string>('');

  const [formOfferTitle, setFormOfferTitle] = useState<string>('LIMITED TIME OFFER');

  const [formStock, setFormStock] = useState<number>(0);

  const [formMinAlert, setFormMinAlert] = useState(3);

  const [formSku, setFormSku] = useState('');

  const [formBarcode, setFormBarcode] = useState('');

  const [formImage, setFormImage] = useState('https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800');

  const [formImages, setFormImages] = useState<string[]>([]);

  const [formWarranty, setFormWarranty] = useState('1 Year Official Warranty');

  const [formDescription, setFormDescription] = useState('');

  const [formSpecs, setFormSpecs] = useState<{ id: string; key: string; value: string }[]>([

    { id: 'spec-1', key: 'Power / Wattage', value: '100W' },

    { id: 'spec-2', key: 'Voltage', value: '220V - 240V ~ 50Hz' },

    { id: 'spec-3', key: 'Energy Rating', value: '5-Star Inverter Eco' },

    { id: 'spec-4', key: 'Genuine Status', value: '100% Certified Official Import' }

  ]);

  const [formIsFeatured, setFormIsFeatured] = useState(true);

  const [formIsGenuine, setFormIsGenuine] = useState(true);

  const [activeFormTab, setActiveFormTab] = useState<'editor' | 'preview'>('editor');

  const [isUploading, setIsUploading] = useState(false);

  const [isHeroUploading, setIsHeroUploading] = useState(false);

  const [isLogoUploading, setIsLogoUploading] = useState(false);

  const [isCategoryUploading, setIsCategoryUploading] = useState(false);



  // Quick Preset Templates for Table-based Specifications

  const handleLoadCategoryPreset = (categoryName: string) => {

    let presets: { key: string; value: string }[] = [];



    if (categoryName.includes('Cooling') || categoryName.includes('Air')) {

      presets = [

        { key: 'Cooling Power', value: '18,000 BTU/hr (1.5 Ton)' },

        { key: 'Power / Wattage', value: '1500W' },

        { key: 'Voltage', value: '220V - 240V ~ 50Hz' },

        { key: 'Energy Rating', value: '5-Star Inverter' },

        { key: 'Refrigerant', value: 'R32 Eco-Friendly' },

        { key: 'Appliance Type', value: 'Split AC' }

      ];

    } else if (categoryName.includes('Refrigeration') || categoryName.includes('Freezer')) {

      presets = [

        { key: 'Total Capacity', value: '450 Liters (16 Cu. Ft.)' },

        { key: 'Power / Wattage', value: '220W' },

        { key: 'Voltage', value: '220V - 240V ~ 50Hz' },

        { key: 'Energy Rating', value: '4-Star Inverter' },

        { key: 'Defrost System', value: 'Total Frost-Free Auto' },

        { key: 'Cooling Tech', value: 'Twin Cooling Plus' }

      ];

    } else if (categoryName.includes('Kitchen') || categoryName.includes('Oven') || categoryName.includes('Cook')) {

      presets = [

        { key: 'Power / Wattage', value: '1000W Microwave / 1400W Grill' },

        { key: 'Voltage', value: '220V - 240V ~ 50Hz' },

        { key: 'Capacity', value: '30 Liters' },

        { key: 'Cavity Material', value: 'Grade 304 Stainless Steel' },

        { key: 'Control Panel', value: 'Tactile Touch & Digital LED' }

      ];

    } else if (categoryName.includes('Cleaning') || categoryName.includes('Laundry') || categoryName.includes('Wash')) {

      presets = [

        { key: 'Wash Capacity', value: '8.0 kg Load' },

        { key: 'Spin Speed', value: '1400 RPM Max' },

        { key: 'Motor Tech', value: 'EcoSilence Direct Drive Inverter' },

        { key: 'Energy Class', value: 'A+++ Super Efficient' },

        { key: 'Voltage', value: '220V - 240V ~ 50Hz' }

      ];

    } else if (categoryName.includes('Computers') || categoryName.includes('Laptop')) {

      presets = [

        { key: 'Processor / CPU', value: 'Multi-Core High Performance' },

        { key: 'RAM / Memory', value: '16GB DDR5 5600MHz' },

        { key: 'Storage SSD', value: '1TB PCIe Gen4 NVMe' },

        { key: 'Display Screen', value: '4K UHD Anti-Glare' },

        { key: 'Power Adapter', value: '100W USB-C PD Fast Charge' }

      ];

    } else if (categoryName.includes('Phone') || categoryName.includes('Smartphones')) {

      presets = [

        { key: 'Display Screen', value: '6.7" Dynamic OLED 120Hz' },

        { key: 'Processor Chipset', value: 'Flagship 4nm Processor' },

        { key: 'Camera System', value: '50MP OIS Main + 12MP Ultra-Wide' },

        { key: 'Battery & Power', value: '5000 mAh with 45W Fast Charge' },

        { key: 'Connectivity', value: '5G Dual SIM + Wi-Fi 6E' }

      ];

    } else {

      presets = [

        { key: 'Power Output', value: '100W RMS Total' },

        { key: 'Voltage', value: '220V - 240V ~ 50Hz' },

        { key: 'Audio Decoding', value: 'Dolby Atmos / DTS:X' },

        { key: 'Connectivity', value: 'Bluetooth 5.3, HDMI eARC, Optical' }

      ];

    }



    setFormSpecs(

      presets.map((p, idx) => ({

        id: `spec-preset-${idx}-${Date.now()}`,

        key: p.key,

        value: p.value

      }))

    );

  };



  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];

    if (!file) return;



    setIsUploading(true);

    try {

      const url = await processAndUploadImage(file, formImage);

      setFormImage(url);

    } catch (error: any) {

      console.error('Error uploading image:', error);

      showAlert('Upload Error', error.message || 'Error uploading image', 'error');

    } finally {

      setIsUploading(false);

    }

  };



  const [isMultiUploading, setIsMultiUploading] = useState(false);

  const [activeDragImage, setActiveDragImage] = useState<string | null>(null);

  const [bulkUploadProgress, setBulkUploadProgress] = useState<{ current: number; total: number; filename: string } | null>(null);

  const [isBulkUrlModalOpen, setIsBulkUrlModalOpen] = useState(false);

  const [bulkUrlInput, setBulkUrlInput] = useState('');

  const [previewLightboxImage, setPreviewLightboxImage] = useState<string | null>(null);

  const [imageSwapFeedback, setImageSwapFeedback] = useState<string | null>(null);



  const handleBulkFilesUpload = async (files: FileList | File[]) => {

    if (!files || files.length === 0) return;

    const fileArr = Array.from(files);

    setIsMultiUploading(true);

    setBulkUploadProgress({ current: 0, total: fileArr.length, filename: fileArr[0]?.name || 'image' });

    const newUrls: string[] = [];



    for (let i = 0; i < fileArr.length; i++) {

      const file = fileArr[i];

      setBulkUploadProgress({ current: i + 1, total: fileArr.length, filename: file.name });

      try {

        const url = await processAndUploadImage(file);

        if (url) newUrls.push(url);

      } catch (err: any) {

        console.error('Error uploading file in bulk:', file.name, err);

      }

    }



    if (newUrls.length > 0) {

      setFormImages(prev => [...prev, ...newUrls]);

    }

    setIsMultiUploading(false);

    setBulkUploadProgress(null);

  };



  const handleMultiImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const files = e.target.files;

    if (!files || files.length === 0) return;

    await handleBulkFilesUpload(files);

  };



  const handleProcessBulkUrls = () => {

    if (!bulkUrlInput.trim()) return;

    const rawUrls = bulkUrlInput

      .split(/[\n,]+/)

      .map(u => u.trim())

      .filter(u => u.length > 5 && (u.startsWith('http://') || u.startsWith('https://')));



    if (rawUrls.length > 0) {

      setFormImages(prev => [...prev, ...rawUrls]);

      setBulkUrlInput('');

      setIsBulkUrlModalOpen(false);

      setImageSwapFeedback(`Added ${rawUrls.length} images to gallery!`);

      setTimeout(() => setImageSwapFeedback(null), 3000);

    }

  };



  const handleSetAsMain = (imgUrl: string, index: number) => {

    const currentFront = formImage;

    setFormImage(imgUrl);

    setFormImages(prev => {

      const filtered = prev.filter((_, i) => i !== index);

      return currentFront && currentFront.trim() ? [currentFront, ...filtered] : filtered;

    });

    setImageSwapFeedback('Promoted image to Main Front Cover!');

    setTimeout(() => setImageSwapFeedback(null), 3000);

  };



  const handleSwapWithFirstGallery = () => {

    if (formImages.length === 0) return;

    const firstGallery = formImages[0];

    const currentFront = formImage;

    setFormImage(firstGallery);

    setFormImages(prev => [currentFront, ...prev.slice(1)]);

    setImageSwapFeedback('Swapped Front Image with Gallery #1!');

    setTimeout(() => setImageSwapFeedback(null), 3000);

  };



  const handleRemoveImage = (index: number) => {
    setFormImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleMoveImageLeft = (index: number) => {
    if (index <= 0) return;
    setFormImages(prev => arrayMove(prev, index, index - 1));
  };

  const handleMoveImageRight = (index: number) => {
    setFormImages(prev => {
      if (index >= prev.length - 1) return prev;
      return arrayMove(prev, index, index + 1);
    });
  };

  const handleMoveSpecUp = (index: number) => {
    if (index <= 0) return;
    setFormSpecs(prev => arrayMove(prev, index, index - 1));
  };

  const handleMoveSpecDown = (index: number) => {
    setFormSpecs(prev => {
      if (index >= prev.length - 1) return prev;
      return arrayMove(prev, index, index + 1);
    });
  };

  const handleDuplicateSpec = (index: number) => {
    setFormSpecs(prev => {
      const target = prev[index];
      if (!target) return prev;
      const clone = { ...target, id: `spec-${Date.now()}` };
      const next = [...prev];
      next.splice(index + 1, 0, clone);
      return next;
    });
  };

  const handleAddPresetSpec = (keyName: string, defaultValue = '') => {
    setFormSpecs(prev => {
      const exists = prev.some(s => String(s.key || "").toLowerCase().trim() === String(keyName || "").toLowerCase().trim());
      if (exists) return prev;
      return [...prev, { id: `spec-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, key: keyName, value: defaultValue }];
    });
  };



  const sensors = useSensors(

    useSensor(PointerSensor, {

      activationConstraint: {

        distance: 4,

      },

    }),

    useSensor(KeyboardSensor, {

      coordinateGetter: sortableKeyboardCoordinates,

    })

  );



  const handleDragStart = (event: DragStartEvent) => {

    setActiveDragImage(event.active.id as string);

  };



  const handleDragEnd = (event: DragEndEvent) => {

    const { active, over } = event;

    if (!over) {

      setActiveDragImage(null);

      return;

    }



    if (over.id === 'main-hero-dropzone') {

      const draggedUrl = active.id as string;

      const currentFront = formImage;

      setFormImage(draggedUrl);

      setFormImages(prev => {

        const withoutDragged = prev.filter(img => img !== draggedUrl);

        return currentFront && currentFront.trim() ? [currentFront, ...withoutDragged] : withoutDragged;

      });

      setImageSwapFeedback('✨ Promoted image to Main Front Cover!');

      setTimeout(() => setImageSwapFeedback(null), 3500);

    } else if (active.id !== over.id) {

      setFormImages((items) => {

        const oldIndex = items.indexOf(active.id as string);

        const newIndex = items.indexOf(over.id as string);

        return arrayMove(items, oldIndex, newIndex);

      });

    }

    setActiveDragImage(null);

  };



  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];

    if (!file) return;



    setIsHeroUploading(true);

    try {

      const url = await processAndUploadImage(file, settingsForm.heroImage);

      setSettingsForm((prev) => ({ ...prev, heroImage: url }));

    } catch (error: any) {

      console.error('Error uploading hero image:', error);

      showAlert('Upload Error', error.message || 'Error uploading hero image', 'error');

    } finally {

      setIsHeroUploading(false);

    }

  };



  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];

    if (!file) return;



    setIsLogoUploading(true);

    try {

      const url = await processAndUploadImage(file, settingsForm.logoUrl);

      setSettingsForm((prev) => ({ ...prev, logoUrl: url }));

    } catch (error: any) {

      console.error('Error uploading logo:', error);

      showAlert('Upload Error', error.message || 'Error uploading logo', 'error');

    } finally {

      setIsLogoUploading(false);

    }

  };



  // POS State
  const [posCart, setPosCart] = useState<{ product: Product; quantity: number; serialNumbers?: string[]; priceTier?: 'retail' | 'wholesale'; price?: number }[]>([]);
  const [showPOSSalePreview, setShowPOSSalePreview] = useState(false);
  const [posPriceTier, setPosPriceTier] = useState<'retail' | 'wholesale'>('retail');
  const [posWholesaleDiscountPct, setPosWholesaleDiscountPct] = useState<number>(8);
  const [isZReportOpen, setIsZReportOpen] = useState(false);
  const [isSplitPaymentMode, setIsSplitPaymentMode] = useState(false);
  const [splitPaymentsList, setSplitPaymentsList] = useState<{ method: string; amount: number; reference?: string }[]>([
    { method: 'Cash', amount: 0, reference: '' },
    { method: 'Mobile Money (M-Pesa / Airtel Money / Mixx by Yas)', amount: 0, reference: '' },
    { method: 'Bank Transfer / CRDB / NMB', amount: 0, reference: '' }
  ]);
  const [activeSerialInputItem, setActiveSerialInputItem] = useState<{ productId: string; productName: string; quantity: number; currentSerials: string[] } | null>(null);
  const [posDiscount, setPosDiscount] = useState(0);
  const [posExtraCosts, setPosExtraCosts] = useState<ExtraCost[]>([]);
  const [posIncludeVat, setPosIncludeVat] = useState<boolean>(true);
  const [posSendReceiptEmail, setPosSendReceiptEmail] = useState<boolean>(true);
  const [posPaymentMethod, setPosPaymentMethod] = useState<string>('Cash');
  const [posBarcodeQuery, setPosBarcodeQuery] = useState('');
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posCustomerEmail, setPosCustomerEmail] = useState('');
  const [posCustomerTin, setPosCustomerTin] = useState('');
  const [posTenderedAmount, setPosTenderedAmount] = useState<number>(0);
  const [posLoanDownPayment, setPosLoanDownPayment] = useState<number>(0);
  const [posLoanDueDate, setPosLoanDueDate] = useState<string>('');
  const [posLoanNationalId, setPosLoanNationalId] = useState('');
  const [posLoanGuarantorName, setPosLoanGuarantorName] = useState('');
  const [posLoanGuarantorPhone, setPosLoanGuarantorPhone] = useState('');
  const [posOrderNotes, setPosOrderNotes] = useState('');
  const [posViewMode, setPosViewMode] = useState<'grid' | 'compact'>('grid');
  const [posFilterInStockOnly, setPosFilterInStockOnly] = useState(false);
  const [posParkedOrders, setPosParkedOrders] = useState<{
    id: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    customerTin?: string;
    items: { product: Product; quantity: number; serialNumbers?: string[]; priceTier?: 'retail' | 'wholesale'; price?: number }[];
    discount: number;
    extraCosts?: ExtraCost[];
    notes?: string;
    createdAt: string;
  }[]>(() => {
    try {
      const saved = localStorage.getItem('ge_pos_parked_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showParkedModal, setShowParkedModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<POSTransaction | null>(null);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedPosIds, setSelectedPosIds] = useState<string[]>([]);

  // Auto-switch POS price tier based on cart volume (more than 2 products)
  const posTotalQuantity = useMemo(() => posCart.reduce((sum, item) => sum + item.quantity, 0), [posCart]);
  const prevPosTotalQuantityRef = useRef(posTotalQuantity);

  useEffect(() => {
    const prevQty = prevPosTotalQuantityRef.current;
    const currentQty = posTotalQuantity;
    
    // Switch to Wholesale if total quantity crosses >= 2
    if (prevQty < 2 && currentQty >= 2) {
      setPosPriceTier('wholesale');
      triggerHaptic('success');
    }
    // Switch back to Retail if total quantity drops to < 2
    else if (prevQty >= 2 && currentQty < 2) {
      setPosPriceTier('retail');
      triggerHaptic('light');
    }
    
    prevPosTotalQuantityRef.current = currentQty;
  }, [posTotalQuantity]);

  // Dynamic POS Payment Options from saved store settings (including Cash and upcoming disabled Orbi Pay)

  const posAvailablePaymentMethods = useMemo(() => {

    const list: {

      id: string;

      name: string;

      subtitle?: string;

      type: string;

      isUpcoming?: boolean;

      isDisabled?: boolean;

    }[] = [

      {
        id: 'cash',
        name: 'Cash',
        subtitle: 'Physical Cash Drawer / Register',
        type: 'Cash',
        isUpcoming: false,
        isDisabled: false,
      },
      {
        id: 'loan',
        name: 'Loan / Credit',
        subtitle: 'Sell by Installments / Later',
        type: 'Loan',
        isUpcoming: false,
        isDisabled: false,
      },

    ];



    const configured = (settingsForm.paymentMethods || storeSettings?.paymentMethods || []).filter(

      (m) => m.isActive

    );



    if (configured.length > 0) {

      configured.forEach((m) => {

        const isOrbi =

          (m.type || '').toLowerCase().includes('orbi') ||

          (m.provider || '').toLowerCase().includes('orbi') ||

          (m.id || '').toLowerCase().includes('orbi');



        if (!isOrbi) {

          list.push({

            id: m.id || `${m.type}-${m.provider}`,

            name: m.provider || m.type,

            subtitle: m.accountNumber ? `${m.accountName ? m.accountName + ' • ' : ''}${m.accountNumber}` : m.instructions || 'Saved Merchant Account',

            type: m.type,

            isUpcoming: false,

            isDisabled: false,

          });

        }

      });

    } else {

      list.push(

        {

          id: 'card',

          name: 'Credit / Debit Card',

          subtitle: 'Visa, Mastercard & POS Terminal',

          type: 'Card',

          isUpcoming: false,

          isDisabled: false,

        },

        {

          id: 'mobile-money',

          name: 'Mobile Money',

          subtitle: 'M-Pesa / Mixx By Yas / Airtel Money',

          type: 'Mobile Money',

          isUpcoming: false,

          isDisabled: false,

        },

        {

          id: 'bank-transfer',

          name: 'Bank Transfer',

          subtitle: 'Direct Bank Wire (CRDB / NMB)',

          type: 'Bank Transfer',

          isUpcoming: false,

          isDisabled: false,

        }

      );

    }



    // Always include "Orbi Pay" as upcoming Business payment method (temporarily disabled on selection)

    list.push({

      id: 'orbi-pay',

      name: 'Orbi Pay',

      subtitle: 'Upcoming Business Payment Solution',

      type: 'Orbi Pay',

      isUpcoming: true,

      isDisabled: true,

    });



    return list;

  }, [settingsForm.paymentMethods, storeSettings?.paymentMethods]);



  // Unique QR Code Module State

  const [selectedQrProduct, setSelectedQrProduct] = useState<Product | null>(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [isBulkQrModalOpen, setIsBulkQrModalOpen] = useState(false);

  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const [copiedQr, setCopiedQr] = useState(false);



  const handleScanQrCode = (scannedString: string) => {

    const raw = String(scannedString ?? '').trim();

    if (!raw) return;

    const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

    let foundProduct: Product | undefined;

    try {

      const parsed = JSON.parse(raw);

      const id = normalize(parsed?.id);
      const sku = normalize(parsed?.sku);
      const barcode = normalize(parsed?.barcode);

      foundProduct = products.find((p) =>
        (id && normalize(p.id) === id) ||
        (sku && normalize(p.sku) === sku) ||
        (barcode && normalize(p.barcode) === barcode)
      );

    } catch {

      const query = normalize(raw);

      foundProduct = products.find((p) =>
        normalize(p.barcode) === query ||
        normalize(p.sku) === query ||
        normalize(p.id) === query ||
        normalize(p.name).includes(query)
      );

    }

    if (foundProduct) {

      const added = handleAddToCartPOS(foundProduct);

      setScanMessage(
        added
          ? `Scanned successfully! Added "${foundProduct.name}" to POS register.`
          : `Cannot add "${foundProduct.name}": insufficient stock.`
      );

    } else {

      setScanMessage(`No product found for scanned code: "${raw}"`);

    }

    setTimeout(() => setScanMessage(null), 4000);

  };

  const handleCopyQrPayload = (product: Product) => {

    const payload = JSON.stringify({

      id: product.id,

      sku: product.sku,

      barcode: product.barcode,

      name: product.name,

      price: product.price,

      currency: 'TZS',

      genuineVerified: true

    });

    navigator.clipboard.writeText(payload);

    setCopiedQr(true);

    setTimeout(() => setCopiedQr(false), 2000);

  };



  const handlePrintSingleQr = () => {

    window.print();

  };



  // Financial reporting helpers. Online revenue is recognized only for paid, non-cancelled
  // orders. POS transactions are treated as completed sales because the POS completion path
  // creates a receipt only after payment selection/checkout.
  const isRecognizedOrder = (order: Order) =>
    String(order.paymentStatus ?? 'Pending').toLowerCase() === 'paid' &&
    String(order.status ?? '').toLowerCase() !== 'cancelled';

  const getTanzaniaDateParts = (value: string | Date | undefined | null) => {
    if (!value) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim().replace(/\s*EAT$/i, '');
      const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
      if (!trimmed.includes('Z') && !trimmed.includes('+') && match) {
        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const day = Number(match[3]);
        const dateObj = new Date(Date.UTC(year, month, day, 12));
        const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
        return {
          year,
          month,
          day,
          weekday,
          dateKey: `${match[1]}-${match[2]}-${match[3]}`,
        };
      }
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return {
      year: Number(map.year),
      month: Number(map.month) - 1,
      day: Number(map.day),
      weekday: map.weekday,
      dateKey: `${map.year}-${map.month}-${map.day}`,
    };
  };

  const totalInventoryValue = products.reduce((sum, p) => sum + Number(p.price || 0) * Math.max(0, Number(p.stock || 0)), 0);
  const recognizedOnlineRevenue = orders
    .filter(isRecognizedOrder)
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const recognizedPosRevenue = posTransactions
    .reduce((sum, t) => sum + Number(t.total ?? (t as any).totalAmount ?? 0), 0);
  const totalRevenue = recognizedOnlineRevenue + recognizedPosRevenue;
  const lowStockProducts = products.filter((p) => Number(p.stock || 0) <= 0);

  const salesTrendData = React.useMemo(() => {
    const now = new Date();
    const localNow = getTanzaniaDateParts(now);
    const todayKey = localNow?.dateKey;

    const recognizedOrders = orders.filter(isRecognizedOrder);

    const revenueForDayKey = (key: string) => {
      const online = recognizedOrders
        .filter(o => getTanzaniaDateParts(o.createdAt)?.dateKey === key)
        .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const pos = posTransactions
        .filter(t => getTanzaniaDateParts(t.createdAt)?.dateKey === key)
        .reduce((sum, t) => sum + Number(t.total ?? (t as any).totalAmount ?? 0), 0);
      return { online, pos };
    };

    const days: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.UTC(
        localNow?.year ?? now.getUTCFullYear(),
        localNow?.month ?? now.getUTCMonth(),
        (localNow?.day ?? now.getUTCDate()) - i
      ));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      const rev = revenueForDayKey(key);
      const txs = recognizedOrders.filter(o => getTanzaniaDateParts(o.createdAt)?.dateKey === key).length +
        posTransactions.filter(t => getTanzaniaDateParts(t.createdAt)?.dateKey === key).length;
      const labelDate = new Date(`${key}T12:00:00Z`);
      days.push({
        label: labelDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
        subLabel: labelDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
        fullLabel: key === todayKey ? 'Today' : labelDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' }),
        revenue: rev.online + rev.pos,
        onlineRevenue: rev.online,
        posRevenue: rev.pos,
        transactions: txs,
      });
    }

    const currentLocal = new Date(Date.UTC(localNow?.year ?? now.getUTCFullYear(), localNow?.month ?? now.getUTCMonth(), localNow?.day ?? now.getUTCDate(), 12));
    const dayOfWeek = currentLocal.getUTCDay();
    const currentWeekStart = new Date(currentLocal);
    currentWeekStart.setUTCDate(currentLocal.getUTCDate() - dayOfWeek);

    const weeks: any[] = [];
    for (let w = 3; w >= 0; w--) {
      const start = new Date(currentWeekStart);
      start.setUTCDate(start.getUTCDate() - w * 7);
      const endExclusive = new Date(start);
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 7);
      const startKey = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`;
      const endKey = `${endExclusive.getUTCFullYear()}-${String(endExclusive.getUTCMonth() + 1).padStart(2, '0')}-${String(endExclusive.getUTCDate()).padStart(2, '0')}`;
      const inRange = (createdAt: string) => {
        const key = getTanzaniaDateParts(createdAt)?.dateKey;
        return Boolean(key && key >= startKey && key < endKey);
      };
      const online = recognizedOrders.filter(o => inRange(o.createdAt)).reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const pos = posTransactions.filter(t => inRange(t.createdAt)).reduce((sum, t) => sum + Number(t.total ?? (t as any).totalAmount ?? 0), 0);
      const txs = recognizedOrders.filter(o => inRange(o.createdAt)).length + posTransactions.filter(t => inRange(t.createdAt)).length;
      weeks.push({
        label: w === 0 ? 'This Week' : `Week ${4 - w}`,
        subLabel: `W${4 - w}`,
        fullLabel: w === 0 ? 'This Week Performance' : `Week ${4 - w} Performance`,
        revenue: online + pos,
        onlineRevenue: online,
        posRevenue: pos,
        transactions: txs,
      });
    }

    const years: any[] = [];
    const year = localNow?.year ?? now.getFullYear();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let m = 0; m < 12; m++) {
      const prefix = `${year}-${String(m + 1).padStart(2, '0')}`;
      const inMonth = (createdAt: string) => getTanzaniaDateParts(createdAt)?.dateKey.startsWith(prefix);
      const online = recognizedOrders.filter(o => inMonth(o.createdAt)).reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const pos = posTransactions.filter(t => inMonth(t.createdAt)).reduce((sum, t) => sum + Number(t.total ?? (t as any).totalAmount ?? 0), 0);
      const txs = recognizedOrders.filter(o => inMonth(o.createdAt)).length + posTransactions.filter(t => inMonth(t.createdAt)).length;
      years.push({ label: months[m], subLabel: `${year}`, fullLabel: `${months[m]} ${year} Performance`, revenue: online + pos, onlineRevenue: online, posRevenue: pos, transactions: txs });
    }

    return { days, weeks, years };
  }, [orders, posTransactions]);

  const { growthLastMonth, salesPerWeek } = React.useMemo(() => {
    const now = new Date();
    const local = getTanzaniaDateParts(now);
    if (!local) return { growthLastMonth: '0.0', salesPerWeek: 0 };

    const currentMonthPrefix = `${local.year}-${String(local.month + 1).padStart(2, '0')}`;
    const previousDate = new Date(Date.UTC(local.year, local.month - 1, 1, 12));
    const previousYear = previousDate.getUTCFullYear();
    const previousMonth = previousDate.getUTCMonth() + 1;
    const previousMonthPrefix = `${previousYear}-${String(previousMonth).padStart(2, '0')}`;

    const orderRevenueForPrefix = (prefix: string) => orders.filter(o => isRecognizedOrder(o) && getTanzaniaDateParts(o.createdAt)?.dateKey.startsWith(prefix)).reduce((a, b) => a + Number(b.totalAmount || 0), 0);
    const posRevenueForPrefix = (prefix: string) => posTransactions.filter(t => getTanzaniaDateParts(t.createdAt)?.dateKey.startsWith(prefix)).reduce((a, b) => a + Number(b.total ?? (b as any).totalAmount ?? 0), 0);

    const thisMonthRev = orderRevenueForPrefix(currentMonthPrefix) + posRevenueForPrefix(currentMonthPrefix);
    const lastMonthRev = orderRevenueForPrefix(previousMonthPrefix) + posRevenueForPrefix(previousMonthPrefix);
    const growth = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : thisMonthRev > 0 ? 100 : 0;

    const todayDate = new Date(Date.UTC(local.year, local.month, local.day, 12));
    const start = new Date(todayDate);
    start.setUTCDate(start.getUTCDate() - todayDate.getUTCDay());
    const startKey = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}-${String(start.getUTCDate()).padStart(2, '0')}`;
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    const endKey = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}`;
    const inWeek = (createdAt: string) => {
      const key = getTanzaniaDateParts(createdAt)?.dateKey;
      return Boolean(key && key >= startKey && key < endKey);
    };
    const salesPerWeek = orders.filter(o => isRecognizedOrder(o) && inWeek(o.createdAt)).length + posTransactions.filter(t => inWeek(t.createdAt)).length;

    return { growthLastMonth: growth.toFixed(1), salesPerWeek };
  }, [orders, posTransactions]);

  const handleOpenAddModal = () => {

    setEditingProduct(null);

    setFormName('');

    const sortedCats = [...(categories || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

    setFormCategory(sortedCats[0]?.name || 'Smartphones');

    setFormBrand('');

    setFormPrice(0);

    setFormCostPrice(0);

    setFormOriginalPrice(0);
    
    setFormWholesalePrice(0);

    setFormIsOnOffer(false);

    setFormIsVatInclusive(true);

    setFormOfferEndsAt('');

    setFormOfferTitle('LIMITED TIME OFFER');

    setFormStock(0);

    setFormMinAlert(3);

    setFormSku(`GE-SKU-${Math.floor(Math.random() * 90000 + 10000)}`);

    setFormBarcode(`${Math.floor(Math.random() * 900000000000 + 100000000000)}`);

    setFormImage('');

    setFormImages([]);

    setFormWarranty('1 Year Official Genuine Manufacturer Warranty');

    setFormDescription('Official certified genuine electronics unit. Includes full original box accessories and sealed manufacturer warranty documentation.');

    setFormSpecs([

      { id: 'spec-1', key: 'Power Output', value: '100W' },

      { id: 'spec-2', key: 'Voltage', value: '220V - 240V ~ 50Hz' },

      { id: 'spec-3', key: 'Energy Rating', value: '5-Star Inverter Eco' },

      { id: 'spec-4', key: 'Condition', value: 'Brand New Sealed Genuine' }

    ]);

    setFormIsFeatured(true);

    setFormIsGenuine(true);

    setActiveFormTab('editor');

    setIsProductModalOpen(true);

  };



  
  
  const handleDuplicateProduct = (product: Product) => {
    setEditingProduct(null); // Force as new
    setFormName(`${product.name || ''} (Copy)`);
    setFormCategory(product.category || '');
    setFormBrand(product.brand || '');
    setFormPrice(product.price);
    setFormCostPrice(product.costPrice || 0);
    setFormOriginalPrice(product.originalPrice || 0);
    setFormWholesalePrice(product.wholesalePrice || 0);
    setFormIsOnOffer(!!product.isOnOffer);
    setFormIsVatInclusive(product.isVatInclusive !== false);
    setFormOfferEndsAt(product.offerEndsAt || '');
    setFormOfferTitle(product.offerTitle || 'LIMITED TIME OFFER');
    setFormStock(product.stock);
    setFormMinAlert(product.minStockAlert || 3);
    setFormSku(''); // Reset
    setFormBarcode(''); // Reset
    setFormImage(product.image);

    const rawImgs = product.images || (product as any).images_gallery || (product as any).additional_images;
    let initialImages: string[] = [];
    if (Array.isArray(rawImgs)) {
      initialImages = rawImgs.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
    } else if (typeof rawImgs === 'string') {
      try {
        const parsed = JSON.parse(rawImgs);
        if (Array.isArray(parsed)) initialImages = parsed.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
        else if (typeof parsed === 'string' && parsed.trim().length > 0) initialImages = [parsed.trim()];
      } catch (_) {
        if (rawImgs.includes(',')) initialImages = rawImgs.split(',').map((s: string) => s.trim()).filter(Boolean);
        else if (rawImgs.trim().length > 0) initialImages = [rawImgs.trim()];
      }
    }
    setFormImages(initialImages);
    setFormWarranty(product.warranty || '');
    setFormDescription(product.description || '');
    setFormIsFeatured(!!product.featured);
    setFormIsGenuine(product.isGenuineVerified !== false);
    
    if (product.specs) {
      setFormSpecs(
        Object.entries(product.specs).map(([key, value], idx) => ({
          id: `spec-edit-${idx}-${Date.now()}`,
          key,
          value
        }))
      );
    } else {
      setFormSpecs([]);
    }
    setActiveFormTab('editor');
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {

    setEditingProduct(product);

    setFormName(product.name || '');

    setFormCategory(product.category || '');

    setFormBrand(product.brand || '');

    setFormPrice(product.price);

    setFormCostPrice(product.costPrice || 0);

    setFormOriginalPrice(product.originalPrice || 0);

    setFormWholesalePrice(product.wholesalePrice || 0);

    setFormIsOnOffer(!!product.isOnOffer);

    setFormIsVatInclusive(product.isVatInclusive !== false);

    setFormOfferEndsAt(product.offerEndsAt || '');

    setFormOfferTitle(product.offerTitle || 'LIMITED TIME OFFER');

    setFormStock(product.stock);

    setFormMinAlert(product.minStockAlert || 3);

    setFormSku(product.sku || '');

    setFormBarcode(product.barcode || '');

    setFormImage(product.image);

    const rawImgs = product.images || (product as any).images_gallery || (product as any).additional_images;

    let initialImages: string[] = [];

    if (Array.isArray(rawImgs)) {

      initialImages = rawImgs.filter((img: any) => typeof img === 'string' && img.trim().length > 0);

    } else if (typeof rawImgs === 'string') {

      try {

        const parsed = JSON.parse(rawImgs);

        if (Array.isArray(parsed)) initialImages = parsed.filter((img: any) => typeof img === 'string' && img.trim().length > 0);

        else if (typeof parsed === 'string' && parsed.trim().length > 0) initialImages = [parsed.trim()];

      } catch (_) {

        if (rawImgs.includes(',')) initialImages = rawImgs.split(',').map((s: string) => s.trim()).filter(Boolean);

        else if (rawImgs.trim().length > 0) initialImages = [rawImgs.trim()];

      }

    }

    setFormImages(initialImages);

    setFormWarranty(product.warranty || '');

    setFormDescription(product.description || '');

    setFormIsFeatured(!!product.featured);

    setFormIsGenuine(product.isGenuineVerified !== false);

    

    if (product.specs) {
      setFormSpecs(
        Object.entries(product.specs).map(([key, value], idx) => ({
          id: `spec-edit-${idx}-${Date.now()}`,
          key,
          value
        }))
      );
    } else {
      setFormSpecs([]);
    }



    setActiveFormTab('editor');

    setIsProductModalOpen(true);

  };



  const handleResetAppData = async () => {

    showPasswordConfirm(

      'Factory Data Reset',

      'This is a CRITICAL action. It will permanently delete ALL orders, transactions, products, categories, and customer profiles. Please enter your admin password to proceed.',

      async (password) => {

        if (!password || password.length < 5) {

          showAlert('Authorization Error', 'A valid admin password is required for this destructive action.', 'error');

          return;

        }



        setSyncFeedback({ text: 'Starting full factory data reset...', type: 'success' });

        

        try {

          const allImagesToDelete: string[] = [];

          products.forEach(p => {

            if (p.image) allImagesToDelete.push(p.image);

            if (Array.isArray(p.images)) allImagesToDelete.push(...p.images);

          });

          categories.forEach(c => {

            if (c.image) allImagesToDelete.push(c.image);

          });

          staff.forEach(s => {

            if (s.avatar) allImagesToDelete.push(s.avatar);

          });

          if (allImagesToDelete.length > 0) {

            await deleteStorageImage(allImagesToDelete);

          }



          if (clearOrders) await clearOrders();

          if (clearPOSTransactions) await clearPOSTransactions();

          if (clearProducts) await clearProducts();

          if (clearCategories) await clearCategories();

          if (clearProfiles) await clearProfiles();

          

          showAlert('Reset Success', 'Factory reset complete! All collections have been purged from the database.');

          setSyncFeedback({ text: 'Factory reset complete! All collections have been purged.', type: 'success' });

          setTimeout(() => setSyncFeedback(null), 5000);

        } catch (err) {

          console.error('Reset failed:', err);

          showAlert('Reset Failed', `System error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');

          setSyncFeedback({ text: `Reset failed: ${err instanceof Error ? err.message : 'Unknown error'}`, type: 'error' });

        }

      }

    );

  };



  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ensureOnline('save product details')) return;
    setIsSavingProduct(true);

    setProductFormError(null);



    try {

      // Convert formSpecs array into key-value map

      const specsMap: Record<string, string> = {};

      formSpecs.forEach((item) => {

        if (item.key.trim() && item.value.trim()) {

          specsMap[item.key.trim()] = item.value.trim();

        }

      });



      const discPct = formOriginalPrice > formPrice 

        ? Math.round(((formOriginalPrice - formPrice) / formOriginalPrice) * 100) 

        : 0;



      if (editingProduct) {

        // Calculate replaced/removed cloud assets now, but delete them only after the
        // product update succeeds so a failed save never destroys the old asset.
        const oldImages = [editingProduct.image, ...(editingProduct.images || [])].filter((u): u is string => typeof u === 'string' && u.length > 0);

        const newImagesSet = new Set([formImage, ...formImages].filter((u): u is string => typeof u === 'string' && u.length > 0));

        const removedImages = oldImages.filter(url => !newImagesSet.has(url));

        await updateProduct({

          ...editingProduct,

          name: formName,

          category: formCategory,

          brand: formBrand,

          price: formPrice,

          costPrice: formCostPrice,

          originalPrice: formOriginalPrice > 0 ? formOriginalPrice : 0,

          wholesalePrice: formWholesalePrice > 0 ? formWholesalePrice : 0,

          discountPrice: formOriginalPrice > formPrice ? formPrice : 0,

          discountPercentage: discPct,

          isOnOffer: Boolean(formIsOnOffer),

          offerEndsAt: formOfferEndsAt || '',

          offerTitle: formOfferTitle || (formIsOnOffer ? 'LIMITED TIME OFFER' : ''),

          stock: formStock,

          minStockAlert: formMinAlert,

          sku: formSku,

          barcode: formBarcode,

          image: formImage,

          images: formImages,

          warranty: formWarranty,

          description: formDescription,

          specs: specsMap,

          featured: formIsFeatured,

          isGenuineVerified: formIsGenuine,

          isVatInclusive: formIsVatInclusive,

        });

        if (removedImages.length > 0) {
          await deleteStorageImage(removedImages);
        }

      } else {

        await addProduct({

          name: formName,

          category: formCategory,

          brand: formBrand,

          price: formPrice,

          costPrice: formCostPrice,

          originalPrice: formOriginalPrice > 0 ? formOriginalPrice : 0,

          wholesalePrice: formWholesalePrice > 0 ? formWholesalePrice : 0,

          discountPrice: formOriginalPrice > formPrice ? formPrice : 0,

          discountPercentage: discPct,

          isOnOffer: Boolean(formIsOnOffer),

          offerEndsAt: formOfferEndsAt || '',

          offerTitle: formOfferTitle || (formIsOnOffer ? 'LIMITED TIME OFFER' : ''),

          stock: formStock,

          minStockAlert: formMinAlert,

          sku: formSku,

          barcode: formBarcode,

          image: formImage,

          images: formImages,

          rating: 5.0,

          reviewsCount: 1,

          description: formDescription,

          specs: specsMap,

          warranty: formWarranty,

          isGenuineVerified: formIsGenuine,

          featured: formIsFeatured,

          isVatInclusive: formIsVatInclusive,

        });

      }

      setIsProductModalOpen(false);

    } catch (err: any) {

      console.error('Error saving product:', err);

      setProductFormError(err?.message || 'Failed to save product. Check database connection.');

    } finally {

      setIsSavingProduct(false);

    }

  };



  // POS Handlers
  const handleAddToCartPOS = (product: Product): boolean => {
    const availableStock = Math.max(0, Number(product.stock || 0));

    if (availableStock <= 0) {
      showAlert('Empty Stock Warning', `Cannot sell empty stock. "${product.name}" has 0 stock available.`, 'warning');
      return false;
    }

    const existing = posCart.find((item) => item.product.id === product.id);
    const currentQty = existing?.quantity ?? 0;

    if (currentQty >= availableStock) {
      showAlert('Stock Limit Reached', `${product.name} has only ${availableStock} unit(s) available in inventory.`, 'warning');
      return false;
    }

    if (existing) {
      setPosCart((prev) =>
        prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setPosCart((prev) => [...prev, { product, quantity: 1 }]);
    }

    return true;
  };

  const handleUpdateQuantityPOS = (productId: string, qty: number) => {
    const product = products.find(p => p.id === productId);
    const availableStock = Math.max(0, Number(product?.stock || 0));

    if (qty <= 0) {
      handleRemoveItemPOS(productId);
      return;
    }

    if (qty > availableStock) {
      showAlert('Stock Limit', `Only ${availableStock} units available in inventory.`, 'warning');
      qty = availableStock;
    }

    setPosCart(prev => prev.map(item => item.product.id === productId ? { ...item, quantity: qty } : item));
  };

  const handleRemoveItemPOS = (productId: string) => {
    setPosCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleClearCartPOS = () => {
    setPosCart([]);
    setPosDiscount(0);
    setPosExtraCosts([]);
    setPosTenderedAmount(0);
    setPosLoanDownPayment(0);
    setPosLoanDueDate('');
    setPosLoanNationalId('');
    setPosLoanGuarantorName('');
    setPosLoanGuarantorPhone('');
    setPosOrderNotes('');
    setPosCustomerName('');
    setPosCustomerPhone('');
    setPosCustomerTin('');
  };

  const handleParkCurrentCart = () => {
    if (posCart.length === 0) {
      showAlert('Empty Cart', 'Add at least one item before holding/parking a sale.', 'warning');
      return;
    }

    const newParked = {
      id: `PARK-${Date.now().toString(36).toUpperCase()}`,
      customerName: String(posCustomerName || '').trim() || 'Walk-in Customer',
      customerPhone: String(posCustomerPhone || '').trim(),
      customerEmail: String(posCustomerEmail || '').trim(),
      customerTin: String(posCustomerTin || '').trim(),
      items: [...posCart],
      discount: posDiscount,
      extraCosts: [...posExtraCosts],
      notes: String(posOrderNotes || ''),
      createdAt: new Date().toISOString(),
    };

    const updatedParked = [newParked, ...posParkedOrders];
    setPosParkedOrders(updatedParked);
    try {
      localStorage.setItem('ge_pos_parked_orders', JSON.stringify(updatedParked));
    } catch {}

    handleClearCartPOS();
    showAlert('Sale Held / Parked', `Order parked for "${newParked.customerName}". You can recall it anytime.`, 'alert');
  };

  const handleResumeParkedCart = (parkedId: string) => {
    const target = posParkedOrders.find(p => p.id === parkedId);
    if (!target) return;

    const executeResume = () => {
      setPosCart(target.items);
      setPosDiscount(target.discount || 0);
      setPosExtraCosts(target.extraCosts || []);
      setPosCustomerName(target.customerName === 'Walk-in Customer' ? '' : target.customerName);
      setPosCustomerPhone(target.customerPhone || '');
      setPosCustomerEmail(target.customerEmail || '');
      setPosCustomerTin(target.customerTin || '');
      setPosOrderNotes(target.notes || '');

      const updated = posParkedOrders.filter(p => p.id !== parkedId);
      setPosParkedOrders(updated);
      try {
        localStorage.setItem('ge_pos_parked_orders', JSON.stringify(updated));
      } catch {}

      setShowParkedModal(false);
      showAlert('Sale Resumed', `Parked sale for "${target.customerName}" loaded into POS terminal.`, 'alert');
    };

    if (posCart.length > 0) {
      showConfirm(
        'Resume Parked Sale',
        'Active cart has items. Replacing it with this parked sale. Proceed?',
        executeResume,
        'warning'
      );
    } else {
      executeResume();
    }
  };

  const handleDeleteParkedCart = (parkedId: string) => {
    const updated = posParkedOrders.filter(p => p.id !== parkedId);
    setPosParkedOrders(updated);
    try {
      localStorage.setItem('ge_pos_parked_orders', JSON.stringify(updated));
    } catch {}
  };

  const getPosItemUnitPrice = (item: { product: Product; priceTier?: 'retail' | 'wholesale'; price?: number }) => {
    const tier = item.priceTier || posPriceTier;
    if (tier === 'wholesale') {
      if (item.price !== undefined && item.price > 0) return item.price;
      if (item.product.wholesalePrice && item.product.wholesalePrice > 0) return item.product.wholesalePrice;
      
      const retailPrice = Number(item.product.price || 0);
      const costPrice = Number(item.product.costPrice || 0);

      // If user customized posWholesaleDiscountPct away from default (8%), respect the manual selector
      // Otherwise, use dynamic value-based discount tier (< 10%) based on product value
      let discountPct = posWholesaleDiscountPct;
      if (posWholesaleDiscountPct === 8) {
        if (retailPrice >= 2000000) {
          discountPct = 2; // 2% off high-value items (protect margin on big ticket items)
        } else if (retailPrice >= 800000) {
          discountPct = 3.5; // 3.5% off mid-high items
        } else if (retailPrice >= 250000) {
          discountPct = 5; // 5% off mid items
        } else {
          discountPct = 6; // 6% off standard everyday items (< 10%)
        }
      }
      
      let calculatedWholesale = Math.round(retailPrice * (1 - discountPct / 100));
      
      // Strict Profit Margin Protection: Never sell below cost price + minimal profit buffer
      if (costPrice > 0) {
        if (calculatedWholesale < costPrice) {
          calculatedWholesale = costPrice;
        }
      }
      
      return calculatedWholesale;
    }
    return Number(item.product.price || 0);
  };

  const posVatPct = Math.min(100, Math.max(0, Number(storeSettings?.vatPercentage ?? 18)));
  const posCartGross = posCart.reduce((sum, item) => sum + getPosItemUnitPrice(item) * item.quantity, 0);
  const posExtraCostsTotal = posExtraCosts.reduce((sum, cost) => sum + (Number(cost.amount) || 0), 0);
  const posDiscountClamped = Math.min(Math.max(0, Number(posDiscount) || 0), posCartGross);
  const posDiscountedGross = Math.max(0, posCartGross - posDiscountClamped);

  const posVatInclusiveGross = posCart.reduce((sum, item) => {
    const isItemVat = item.product?.isVatInclusive !== false;
    return isItemVat ? sum + getPosItemUnitPrice(item) * item.quantity : sum;
  }, 0);
  const posDiscountOnVatGross = posCartGross > 0 ? (posVatInclusiveGross / posCartGross) * posDiscountClamped : 0;
  const posDiscountedVatGross = Math.max(0, posVatInclusiveGross - posDiscountOnVatGross);

  const posTax = (posIncludeVat && posVatInclusiveGross > 0 && posVatPct > 0)
    ? Math.round(posDiscountedVatGross * (posVatPct / (100 + posVatPct)))
    : 0;
  const posSubtotal = (posIncludeVat && posTax > 0) ? posDiscountedGross - posTax : posDiscountedGross;
  const posTotal = Math.max(0, posDiscountedGross + posExtraCostsTotal);
  const posSplitTotalPaid = splitPaymentsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const posEffectiveTendered = isSplitPaymentMode ? posSplitTotalPaid : posTenderedAmount;
  const posChangeAmount = isSplitPaymentMode
    ? (posSplitTotalPaid > posTotal ? posSplitTotalPaid - posTotal : 0)
    : (posPaymentMethod === 'Cash' && posTenderedAmount > posTotal ? posTenderedAmount - posTotal : 0);

  const handleCompletePOS = async () => {
    if (posCart.length === 0) return;
    if (!ensureOnline('complete checkout transactions')) return;

    if (isSplitPaymentMode) {
      const validSplits = splitPaymentsList.filter(p => Number(p.amount) > 0);
      if (validSplits.length === 0) {
        showAlert('Split Payment Error', 'Please enter payment amounts for the split tender methods.', 'warning');
        return;
      }
      if (posSplitTotalPaid < posTotal) {
        showAlert(
          'Incomplete Split Payment',
          `Total allocated (${formatTZS(posSplitTotalPaid)}) is less than total payable (${formatTZS(posTotal)}). Please allocate the remaining ${formatTZS(posTotal - posSplitTotalPaid)}.`,
          'warning'
        );
        return;
      }
    }

    // Re-check the snapshot of inventory immediately before checkout. The definitive
    // protection should be the backend completePOSTransaction transaction below.
    const stockErrors = posCart.filter(item => {
      const current = products.find(p => p.id === item.product.id);
      return !current || Number(current.stock || 0) < item.quantity;
    });

    if (stockErrors.length > 0) {
      showAlert(
        'Insufficient Stock',
        stockErrors.map(item => `${item.product.name}: requested ${item.quantity}, available ${products.find(p => p.id === item.product.id)?.stock ?? 0}`).join('\n'),
        'warning'
      );
      return;
    }

    const activeCashierName = profile?.fullName || profile?.displayName || profile?.full_name || user?.email || 'System Admin';
    const eat = getEATCurrentParts();
    const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
    const receiptNumber = `REC-${eat.yy}${eat.mm}${eat.dd}-${eat.hh}${eat.mn}${eat.ss}-${uniqueSuffix}`;
    const createdAt = new Date().toISOString();

    const finalPaymentMethod = isSplitPaymentMode
      ? `Split Tender (${splitPaymentsList.filter(p => Number(p.amount) > 0).map(p => p.method.split(' ')[0]).join(' + ')})`
      : posPaymentMethod;

    const pmPos = (posPaymentMethod || '').toLowerCase();
    const isCreditCardPos = pmPos.includes('credit card') || pmPos.includes('card') || pmPos.includes('visa') || pmPos.includes('mastercard');

    const isOrderLoan = Boolean(
      !isSplitPaymentMode && !isCreditCardPos && (
        pmPos.includes('loan') ||
        pmPos.includes('installment') ||
        pmPos.includes('mkopo') ||
        pmPos.includes('debt') ||
        pmPos.includes('deni') ||
        pmPos.includes('store credit') ||
        (pmPos.includes('credit') && !pmPos.includes('card'))
      )
    );

    const receipt: POSTransaction = {
      id: receiptNumber,
      receiptNumber,
      items: posCart.map(item => ({
        ...item,
        price: getPosItemUnitPrice(item),
        priceTier: item.priceTier || posPriceTier,
        serialNumbers: item.serialNumbers || [],
        quantity: Number(item.quantity)
      })),
      subtotal: Math.max(0, posSubtotal),
      tax: Math.max(0, posTax),
      discount: posDiscountClamped,
      extraCosts: posExtraCosts.filter(c => c.name.trim() && Number(c.amount) > 0),
      total: Math.max(0, posTotal),
      paymentMethod: finalPaymentMethod,
      splitPayments: isSplitPaymentMode ? splitPaymentsList.filter(p => Number(p.amount) > 0) : undefined,
      priceTier: posPriceTier,
      cashierName: activeCashierName,
      customerName: String(posCustomerName || '').trim() || (isOrderLoan && String(posLoanGuarantorName || '').trim() ? `${String(posLoanGuarantorName || '').trim()} (Debtor)` : undefined) || (String(posCustomerPhone || '').trim() ? `Customer (${String(posCustomerPhone || '').trim()})` : 'Walk-in Customer'),
      customerPhone: String(posCustomerPhone || '').trim() || (isOrderLoan ? String(posLoanGuarantorPhone || '').trim() : undefined) || undefined,
      customerEmail: String(posCustomerEmail || '').trim() || undefined,
      customerTin: String(posCustomerTin || '').trim() || undefined,
      tenderedAmount: posEffectiveTendered > 0 ? posEffectiveTendered : undefined,
      changeAmount: posChangeAmount > 0 ? posChangeAmount : undefined,
      isLoan: isOrderLoan,
      is_loan: isOrderLoan,
      downPayment: isOrderLoan ? (posLoanDownPayment > 0 ? posLoanDownPayment : 0) : undefined,
      down_payment: isOrderLoan ? (posLoanDownPayment > 0 ? posLoanDownPayment : 0) : undefined,
      loanBalance: isOrderLoan ? (Math.max(0, posTotal - posLoanDownPayment) > 0 ? Math.max(0, posTotal - posLoanDownPayment) : 0) : 0,
      loan_balance: isOrderLoan ? (Math.max(0, posTotal - posLoanDownPayment) > 0 ? Math.max(0, posTotal - posLoanDownPayment) : 0) : 0,
      loanDueDate: isOrderLoan ? (posLoanDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]) : undefined,
      loan_due_date: isOrderLoan ? (posLoanDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]) : undefined,
      loanNationalId: isOrderLoan ? (String(posLoanNationalId || '').trim() || undefined) : undefined,
      loan_national_id: isOrderLoan ? (String(posLoanNationalId || '').trim() || undefined) : undefined,
      loanGuarantorName: isOrderLoan ? (String(posLoanGuarantorName || '').trim() || undefined) : undefined,
      loan_guarantor_name: isOrderLoan ? (String(posLoanGuarantorName || '').trim() || undefined) : undefined,
      loanGuarantorPhone: isOrderLoan ? (String(posLoanGuarantorPhone || '').trim() || undefined) : undefined,
      loan_guarantor_phone: isOrderLoan ? (String(posLoanGuarantorPhone || '').trim() || undefined) : undefined,
      loanStatus: isOrderLoan ? (Math.max(0, posTotal - posLoanDownPayment) > 0 ? 'unpaid' : 'paid') : undefined,
      loan_status: isOrderLoan ? (Math.max(0, posTotal - posLoanDownPayment) > 0 ? 'unpaid' : 'paid') : undefined,
      notes: String(posOrderNotes || '').trim() || undefined,
      vatPercentage: posIncludeVat ? posVatPct : 0,
      includeVat: posIncludeVat,
      createdAt,
    };

    try {
      if (completePOSTransaction) {
        // Production path: backend/database transaction must validate current stock,
        // decrement it, create the receipt, and commit atomically/idempotently.
        await completePOSTransaction(receipt);
      } else {
        // Atomic stock delta deduction for POS transactions
        const stockAdjustments = posCart.map(item => ({
          productId: item.product.id,
          delta: -item.quantity,
          reason: 'pos_sale',
          txId: receipt.id
        }));
        
        queueStockDelta(stockAdjustments);
        await addPOSTransaction(receipt);
      }

      setLastReceipt(receipt);
      handleClearCartPOS();
      setIsSplitPaymentMode(false);
      setSplitPaymentsList([
        { method: 'Cash', amount: 0, reference: '' },
        { method: 'Mobile Money (M-Pesa / Airtel Money / Mixx by Yas)', amount: 0, reference: '' },
        { method: 'Bank Transfer / CRDB / NMB', amount: 0, reference: '' }
      ]);

      if (posSendReceiptEmail && posCustomerEmail) {
        sendNotificationMessage({
          type: 'RECEIPT_SHARE',
          channel: 'Email',
          recipientEmail: posCustomerEmail,
          posTransaction: receipt,
          storeSettings: settingsForm
        }).then(res => {
          if (res.success) {
             console.log('Email dispatched successfully');
          }
        });
      }

    } catch (err: any) {
      console.error('POS checkout failed:', err);
      showAlert('Checkout Failed', err?.message || 'The POS transaction could not be completed. No receipt was issued.', 'error');
    }
  };

  const triggerSaveFromShortcut = async () => {

    // 1. If product form modal is open, trigger submit on form

    if (isProductModalOpen) {

      const productForm = document.getElementById('enterprise-product-form') as HTMLFormElement;

      if (productForm) {

        productForm.requestSubmit();

        triggerShortcutFeedback('Saving Genuine Product Specs...', isMac ? '⌘S' : 'Ctrl+S');

        return;

      }

    }



    // 2. If category modal is open, trigger submit

    if (isCategoryModalOpen) {

      const catForm = document.getElementById('admin-category-form') as HTMLFormElement;

      if (catForm) {

        catForm.requestSubmit();

        triggerShortcutFeedback('Saving Category...', isMac ? '⌘S' : 'Ctrl+S');

        return;

      }

    }



    // 3. Save store settings

    setIsSavingSettings(true);

    try {

      if (onUpdateStoreSettings) {

        await onUpdateStoreSettings(settingsForm);

      }

      setSettingsSaved(true);

      triggerShortcutFeedback('Store Settings & Changes Saved', isMac ? '⌘S' : 'Ctrl+S');

      setTimeout(() => setSettingsSaved(false), 3500);

    } catch (err) {

      console.error('Failed to save settings via shortcut:', err);

    } finally {

      setIsSavingSettings(false);

    }

  };



  // Global Keyboard Shortcuts Event Handler

  useEffect(() => {

    const handleKeyDown = (e: KeyboardEvent) => {

      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      const key = String(e.key || "").toLowerCase();



      const activeEl = document.activeElement;

      const isTyping = activeEl && (

        activeEl.tagName === 'INPUT' || 

        activeEl.tagName === 'TEXTAREA' || 

        activeEl.tagName === 'SELECT' ||

        (activeEl as HTMLElement).isContentEditable

      );



      // 1. Escape key - Close any active modal / palette

      if (e.key === 'Escape') {

        if (isCommandPaletteOpen) {

          setIsCommandPaletteOpen(false);

          return;

        }

        if (isShortcutsModalOpen) {

          setIsShortcutsModalOpen(false);

          return;

        }

        if (isProductModalOpen) {

          setIsProductModalOpen(false);

          return;

        }

        if (isScannerOpen) {

          setIsScannerOpen(false);

          return;

        }

        if (isBulkQrModalOpen) {

          setIsBulkQrModalOpen(false);

          return;

        }

        if (isCategoryModalOpen) {

          setIsCategoryModalOpen(false);

          return;

        }

        if (isStaffModalOpen) {

          setIsStaffModalOpen(false);

          return;

        }

        if (isCategoryReorderModalOpen) {

          setIsCategoryReorderModalOpen(false);

          return;

        }



        if (modalConfig.isOpen) {

          setModalConfig(prev => ({ ...prev, isOpen: false }));

          return;

        }

      }



      // 2. Ctrl+S / Cmd+S - Global Save Settings or Active Modal

      if (isCmdOrCtrl && key === 's') {

        e.preventDefault();

        e.stopPropagation();

        triggerSaveFromShortcut();

        return;

      }



      // 3. Ctrl+N / Cmd+N - Global Add Product / Category

      if (isCmdOrCtrl && key === 'n') {

        e.preventDefault();

        e.stopPropagation();

        if (activeTab === 'inventory' && inventorySubTab === 'categories') {

          setEditingCategory(null);

          setCategoryForm({ name: '', swahiliName: '', image: '', description: '' });

          setIsCategoryModalOpen(true);

          triggerShortcutFeedback('Opened Add Category Form', `${isMac ? '⌘' : 'Ctrl'}+N`);

        } else {

          handleOpenAddModal();

          triggerShortcutFeedback('Opened Add Genuine Product Form', `${isMac ? '⌘' : 'Ctrl'}+N`);

        }

        return;

      }



      // 4. Ctrl+K / Cmd+K - Open Command Palette

      if (isCmdOrCtrl && key === 'k') {

        e.preventDefault();

        e.stopPropagation();

        setIsCommandPaletteOpen(prev => !prev);

        return;

      }



      // 5. Ctrl+B / Cmd+B - Scan Barcode / QR

      if (isCmdOrCtrl && key === 'b') {

        e.preventDefault();

        e.stopPropagation();

        setIsScannerOpen(true);

        triggerShortcutFeedback('Opened Barcode & QR Scanner', `${isMac ? '⌘' : 'Ctrl'}+B`);

        return;

      }



      // 6. Ctrl+Shift+L / Cmd+Shift+L - Toggle Theme

      if (isCmdOrCtrl && e.shiftKey && key === 'l') {

        e.preventDefault();

        e.stopPropagation();

        if (onToggleTheme) {

          onToggleTheme();

          triggerShortcutFeedback('Toggled Admin Appearance Mode', `${isMac ? '⌘' : 'Ctrl'}+Shift+L`);

        }

        return;

      }



      // 7. '?' or 'Shift+?' or 'Ctrl+/' - Open Shortcuts Cheat Sheet

      if (((e.key === '?' || (e.shiftKey && e.key === '/')) && !isTyping) || (isCmdOrCtrl && key === '/')) {

        e.preventDefault();

        e.stopPropagation();

        setIsShortcutsModalOpen(true);

        return;

      }



      // 9. F2 - Focus POS Customer Name
      if (key === 'f2' && !isProductModalOpen) {
        e.preventDefault();
        e.stopPropagation();
        setActiveTab('pos');
        setTimeout(() => {
          document.getElementById('pos-customer-name-input')?.focus();
        }, 50);
        triggerShortcutFeedback('Focused Customer Info', 'F2');
        return;
      }

      // 10. F4 - Focus POS Search / Scanner
      if (key === 'f4' && !isProductModalOpen) {
        e.preventDefault();
        e.stopPropagation();
        setActiveTab('pos');
        setTimeout(() => {
          document.getElementById('pos-search-input')?.focus();
        }, 50);
        triggerShortcutFeedback('Focused Scanner/Search', 'F4');
        return;
      }

      // 11. F9 - Quick Checkout POS
      if (key === 'f9' && !isProductModalOpen) {
        e.preventDefault();
        e.stopPropagation();
        if (activeTab !== 'pos') {
          setActiveTab('pos');
        } else if (posCart.length > 0) {
          setShowPOSSalePreview(true);
          triggerShortcutFeedback('Opening Checkout', 'F9');
        }
        return;
      }

      // 8. Tab Navigation (Ctrl+1 through Ctrl+9, Ctrl+0)

      if (isCmdOrCtrl && !e.shiftKey && !e.altKey && !isProductModalOpen && !isCategoryModalOpen && !isStaffModalOpen) {

        if (key === '1') { e.preventDefault(); setActiveTab('dashboard'); triggerShortcutFeedback('Switched to Dashboard', `${isMac ? '⌘' : 'Ctrl'}+1`); }

        else if (key === '2') { e.preventDefault(); setActiveTab('inventory'); triggerShortcutFeedback('Switched to Inventory', `${isMac ? '⌘' : 'Ctrl'}+2`); }

        else if (key === '3') { e.preventDefault(); setActiveTab('pos'); triggerShortcutFeedback('Switched to POS Terminal', `${isMac ? '⌘' : 'Ctrl'}+3`); }

        else if (key === '4') { e.preventDefault(); setActiveTab('orders'); triggerShortcutFeedback('Switched to Orders', `${isMac ? '⌘' : 'Ctrl'}+4`); }

        else if (key === '5') { e.preventDefault(); setActiveTab('pos-sales'); triggerShortcutFeedback('Switched to POS Sales History', `${isMac ? '⌘' : 'Ctrl'}+5`); }

        else if (key === '6') { e.preventDefault(); setActiveTab('staff'); triggerShortcutFeedback('Switched to Staff Roles', `${isMac ? '⌘' : 'Ctrl'}+6`); }

        else if (key === '7') { e.preventDefault(); setActiveTab('customers'); triggerShortcutFeedback('Switched to Customers CRM', `${isMac ? '⌘' : 'Ctrl'}+7`); }

        else if (key === '8') { e.preventDefault(); setActiveTab('offers'); triggerShortcutFeedback('Switched to Offers & Deals', `${isMac ? '⌘' : 'Ctrl'}+8`); }

        else if (key === '9' || key === '0') { e.preventDefault(); setActiveTab('settings'); triggerShortcutFeedback('Switched to Admin Settings', `${isMac ? '⌘' : 'Ctrl'}+0`); }

      }

    };



    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);

  }, [

    isMac,

    isCommandPaletteOpen,

    isShortcutsModalOpen,

    isProductModalOpen,

    isScannerOpen,

    isBulkQrModalOpen,

    isCategoryModalOpen,

    isStaffModalOpen,

    isCategoryReorderModalOpen,

    modalConfig.isOpen,

    activeTab,

    inventorySubTab,

    settingsForm,

    onUpdateStoreSettings,

    onToggleTheme,

  ]);



  return (

    <div className={`w-full h-screen max-h-screen flex flex-col md:flex-row overflow-hidden transition-colors duration-200 ${

      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'

    }`}>

      {/* Mobile Header - Sticky at top for small screens */}

      <header className={`md:hidden flex items-center justify-between px-4 h-16 border-b shrink-0 z-40 ${

        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'

      }`}>

        <div className="flex items-center gap-2">

          <div className="h-10 w-10 flex items-center justify-center overflow-hidden">

            <img 

              src={storeSettings?.logoUrl || BRAND_LOGO_URL} 

              alt="Logo" 

              className="h-full w-full object-contain"

              referrerPolicy="no-referrer"

            />

          </div>

          <div className="flex flex-col leading-none">

            <span className={`font-black text-sm uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Genuine</span>

            <span className={`text-[9px] font-medium uppercase tracking-widest ${isDark ? 'text-blue-400/70' : 'text-slate-400'}`}>Electronics</span>

          </div>

        </div>

        

        <div className="flex items-center gap-2">

          {onLogout && (

            <button

              onClick={onLogout}

              className="p-2 rounded-lg text-slate-400 hover:text-red-500"

            >

              <Lock className="w-5 h-5" />

            </button>

          )}

          <button

            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}

            className={`p-2 rounded-xl border transition-all ${

              isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'

            }`}

          >

            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}

          </button>

        </div>

      </header>



      {/* Mobile Sidebar Overlay */}

      {isMobileMenuOpen && (

        <div 

          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 md:hidden"

          onClick={() => setIsMobileMenuOpen(false)}

        />

      )}



      {/* Admin Sidebar - Sticky and fixed on left for seamless navigation */}

      <aside className={`fixed inset-y-0 left-0 w-72 md:w-64 h-screen md:h-screen md:sticky md:top-0 flex flex-col justify-between shrink-0 border-r transition-all duration-300 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden z-50 transform ${

        isMobileMenuOpen ? 'translate-x-0 shadow-2xl shadow-slate-950/50' : '-translate-x-full md:translate-x-0'

      } ${

        isDark ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-white text-slate-800 border-slate-200 shadow-sm'

      }`}>

        <div>

          <div className={`p-6 border-b flex items-center gap-3 h-16 md:h-auto ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50/80'}`}>

            <div className="h-8 md:h-10 w-auto flex items-center justify-center shrink-0">

              <img 

                src={storeSettings?.logoUrl || BRAND_LOGO_URL} 

                alt="Genuine Electronics Logo" 

                className="h-8 md:h-10 w-auto max-w-[120px] object-contain"

                referrerPolicy="no-referrer"

                onError={(e) => {

                  (e.currentTarget as HTMLElement).style.display = 'none';

                }}

              />

            </div>

            <div>

              <h2 className={`font-extrabold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Admin & POS</h2>

              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Marketplace Suite</p>

            </div>

            <button 

              onClick={() => setIsMobileMenuOpen(false)}

              className="md:hidden ml-auto p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"

            >

              <X className="w-5 h-5" />

            </button>

          </div>



          <nav className="p-4 space-y-1.5 text-sm font-medium">

            <button

              onClick={() => setActiveTab('dashboard')}

              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${

                activeTab === 'dashboard'

                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold'

                  : isDark

                  ? 'hover:bg-slate-800 text-slate-400 hover:text-white'

                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'

              }`}

            >

              <BarChart3 className="w-4 h-4" />

              <span>Dashboard & Sales</span>

            </button>

            <button

              onClick={() => setActiveTab('visitor-analytics')}

              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${

                activeTab === 'visitor-analytics'

                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold'

                  : isDark

                  ? 'hover:bg-slate-800 text-slate-400 hover:text-white'

                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'

              }`}

            >

              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Visitor Analytics</span>
              </div>

              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                activeTab === 'visitor-analytics'
                  ? 'bg-white/20 text-white'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                LIVE
              </span>

            </button>

            <button

              onClick={() => setActiveTab('inventory')}

              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${

                activeTab === 'inventory'

                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold'

                  : isDark

                  ? 'hover:bg-slate-800 text-slate-400 hover:text-white'

                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'

              }`}

            >

              <Package className="w-4 h-4" />

              <span>Inventory & Stock</span>

              {lowStockProducts.length > 0 && (

                <span 

                  title={`${lowStockProducts.length} items low in stock`}

                  className="ml-auto bg-amber-500 text-slate-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full"

                >

                  {lowStockProducts.length}

                </span>

              )}

            </button>

            {/* Unified POS Terminal Hub & Auto-Hiding Animated Submenu */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  if (isPosActive) {
                    setIsPosSubmenuOpen(prev => !prev);
                  } else {
                    setActiveTab('pos');
                    setPosSubTab('register');
                    setIsPosSubmenuOpen(true);
                  }
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                  isPosActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold'
                    : isDark
                    ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                    : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="w-4 h-4" />
                  <span>POS Terminal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isPosActive
                      ? 'bg-white/20 text-white'
                      : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {posTransactions.length}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isPosSubmenuOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isPosSubmenuOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}
                    className="overflow-hidden"
                  >
                    <div className={`pl-2.5 pr-1 py-1 space-y-0.5 rounded-xl transition-all ${
                      isPosActive
                        ? isDark ? 'bg-slate-950/40 border border-slate-800/80' : 'bg-slate-100/70 border border-slate-200/70'
                        : ''
                    }`}>
                      <button
                        type="button"
                        onClick={() => { setActiveTab('pos'); setPosSubTab('register'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activeTab === 'pos'
                            ? 'bg-blue-600/15 text-blue-500 font-bold border border-blue-500/30'
                            : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                        }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Register</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setActiveTab('loans'); setPosSubTab('loans'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activeTab === 'loans'
                            ? 'bg-blue-600/15 text-blue-500 font-bold border border-blue-500/30'
                            : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Sell by Loan</span>
                        </div>
                        {totalLoansCount > 0 && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400">
                            {totalLoansCount}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => { setActiveTab('pos-sales'); setPosSubTab('history'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activeTab === 'pos-sales'
                            ? 'bg-blue-600/15 text-blue-500 font-bold border border-blue-500/30'
                            : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <History className="w-3.5 h-3.5" />
                          <span>Sales History</span>
                        </div>
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                          activeTab === 'pos-sales'
                            ? 'bg-blue-500/20 text-blue-400'
                            : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {posTransactions.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { setActiveTab('debt-analytics'); setPosSubTab('debt-analytics'); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          activeTab === 'debt-analytics'
                            ? 'bg-blue-600/15 text-blue-500 font-bold border border-blue-500/30'
                            : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Debt Analytics</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold'
                  : isDark
                  ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Online Orders</span>
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isDark ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-800 border-blue-200'
              }`}>
                {orders.length}
              </span>
            </button>

            <button

              onClick={() => setActiveTab('staff')}

              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${

                activeTab === 'staff'

                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold'

                  : isDark

                  ? 'hover:bg-slate-800 text-slate-400 hover:text-white'

                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'

              }`}

            >

              <Users className="w-4 h-4" />

              <span>Staff & Permissions</span>

            </button>

            <button

              onClick={() => setActiveTab('customers')}

              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${

                activeTab === 'customers'

                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold'

                  : isDark

                  ? 'hover:bg-slate-800 text-slate-400 hover:text-white'

                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'

              }`}

            >

              <User className="w-4 h-4" />

              <span>Customers CRM</span>

            </button>

            <button

              onClick={() => setActiveTab('offers')}

              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${

                activeTab === 'offers'

                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20 font-bold'

                  : isDark

                  ? 'hover:bg-slate-800 text-slate-400 hover:text-white'

                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'

              }`}

            >

              <Zap className="w-4 h-4 text-amber-400" />

              <span>Offers</span>

              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">

                {products.filter(p => p.isOnOffer || (p.originalPrice && p.originalPrice > p.price)).length}

              </span>

            </button>

            <button

              onClick={() => setActiveTab('settings')}

              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${

                activeTab === 'settings'

                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold'

                  : isDark

                  ? 'hover:bg-slate-800 text-slate-400 hover:text-white'

                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'

              }`}

            >

              <Settings className="w-4 h-4" />

              <span>Settings & Templates</span>

            </button>

            <button

              onClick={() => setActiveTab('audit-logs')}

              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${

                activeTab === 'audit-logs'

                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 font-bold'

                  : isDark

                  ? 'hover:bg-slate-800 text-slate-400 hover:text-white'

                  : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'

              }`}

            >

              <ShieldCheck className="w-4 h-4 text-emerald-400" />

              <span>Audit Logs & Security</span>

            </button>

          </nav>

        </div>



        <div className={`p-4 border-t space-y-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>

          <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${

            isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'

          }`}>

            <div className="flex items-center gap-3 overflow-hidden">

              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">

                {(profile?.displayName || profile?.fullName || profile?.full_name || user?.email || 'A').charAt(0).toUpperCase()}

              </div>

              <div className="overflow-hidden">

                <h4 className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>

                  {profile?.displayName || profile?.fullName || profile?.full_name || user?.email?.split('@')[0] || 'Administrator'}

                </h4>

                <p className="text-[10px] text-slate-500 truncate">{user?.email || 'admin@genuine-electronics.com'}</p>

                <p className="text-[10px] text-emerald-500 flex items-center gap-1 font-medium mt-0.5">

                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>

                  {profile?.role === 'admin' ? 'Super Admin' : 'Staff Admin'}

                </p>

              </div>

            </div>

            {onLogout && (

              <button

                onClick={onLogout}

                title="Sign Out"

                className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"

              >

                <Lock className="w-4 h-4" />

              </button>

            )}

          </div>

        </div>

      </aside>



      {/* Main Admin Workspace Container */}

      <div className="flex-1 h-full flex flex-col min-w-0 overflow-hidden relative">

        {/* Admin Top Header Utility Bar */}

        <div className={`h-14 border-b px-4 md:px-8 flex items-center justify-between gap-4 shrink-0 z-10 transition-colors ${

          isDark ? 'bg-slate-900/80 border-slate-800 backdrop-blur-md' : 'bg-white/80 border-slate-200 backdrop-blur-md shadow-sm'

        }`}>

          {/* Quick Search & Command Trigger */}

          <button

            type="button"

            onClick={() => setIsCommandPaletteOpen(true)}

            className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-all max-w-sm w-full sm:w-80 ${

              isDark 

                ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700' 

                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300'

            }`}

          >

            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />

            <span className="truncate">Quick actions & catalog search...</span>

            <kbd className={`ml-auto px-1.5 py-0.5 text-[10px] font-mono font-bold rounded border shrink-0 ${

              isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-300 text-slate-600'

            }`}>

              {isMac ? '⌘K' : 'Ctrl+K'}

            </kbd>

          </button>



          {/* Quick Actions & Shortcut Indicators */}

          <div className="flex items-center gap-2">

            <button

              type="button"

              onClick={handleOpenAddModal}

              title={`Add New Product (${isMac ? '⌘N' : 'Ctrl+N'})`}

              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"

            >

              <Plus className="w-3.5 h-3.5" />

              <span>Add Product</span>

              <kbd className="ml-1 px-1 py-0.5 text-[9px] font-mono bg-white/20 rounded">

                {isMac ? '⌘N' : 'Ctrl+N'}

              </kbd>

            </button>



            {activeTab === 'settings' && (

              <button

                type="button"

                onClick={triggerSaveFromShortcut}

                disabled={isSavingSettings}

                title={`Save Settings (${isMac ? '⌘S' : 'Ctrl+S'})`}

                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${

                  settingsSaved

                    ? 'bg-emerald-600 text-white shadow-emerald-600/20'

                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'

                }`}

              >

                {isSavingSettings ? (

                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />

                ) : settingsSaved ? (

                  <CheckCircle className="w-3.5 h-3.5 text-white" />

                ) : (

                  <Save className="w-3.5 h-3.5 text-emerald-400" />

                )}

                <span>{settingsSaved ? 'Saved' : 'Save'}</span>

                <kbd className="ml-1 px-1 py-0.5 text-[9px] font-mono bg-white/10 rounded">

                  {isMac ? '⌘S' : 'Ctrl+S'}

                </kbd>

              </button>

            )}









            <button
              type="button"
              onClick={() => setIsShortcutsModalOpen(true)}
              title="Keyboard Shortcuts Cheat Sheet (?)"
              className={`p-2 md:hidden rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isDark 
                  ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 shadow-xs'
              }`}
            >
              <Keyboard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <kbd className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}>
                ?
              </kbd>
            </button>

            
            <button
              type="button"
              onClick={() => {
                setActiveTab('orders');
              }}
              title="View Pending Orders"
              className={`relative p-2 flex rounded-xl border text-xs font-semibold flex items-center justify-center transition-all ${
                isDark 
                  ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 shadow-xs'
              }`}
            >
              <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {onSwitchToClient && (

              <button

                type="button"

                onClick={onSwitchToClient}

                title="Jump to Client Storefront App"

                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${

                  isDark

                    ? 'border-blue-900/40 text-blue-400 bg-blue-950/30 hover:bg-blue-900/50 hover:text-blue-300'

                    : 'border-blue-200 text-blue-700 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-800 shadow-xs'

                }`}

              >

                <Globe className="w-3.5 h-3.5 text-blue-500" />

                <span className="hidden sm:inline">Client App</span>

              </button>

            )}

            {onLogout && (

              <button

                type="button"

                onClick={onLogout}

                title="Log Out & Exit Admin Dashboard"

                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${

                  isDark

                    ? 'border-red-900/40 text-red-400 bg-red-950/30 hover:bg-red-900/50 hover:text-red-300'

                    : 'border-red-200 text-red-700 bg-red-50/80 hover:bg-red-100 hover:text-red-800 shadow-xs'

                }`}

              >

                <LogOut className="w-3.5 h-3.5 text-red-500" />

                <span>Log Out</span>

              </button>

            )}

          </div>

        </div>



        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 space-y-4 sm:space-y-5 scroll-smooth pb-8 md:pb-12">

        {/* Rate Limit Backoff Warning */}

        {rateLimitStatus.limited && (

          <div className="max-w-6xl mx-auto mb-4 animate-in fade-in slide-in-from-top-2 duration-300">

            <div className="p-3.5 rounded-2xl border bg-amber-500/10 border-amber-500/30 text-amber-500 flex items-center justify-between gap-3 shadow-md">

              <div className="flex items-center gap-3 min-w-0">

                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />

                <div className="text-xs font-bold">

                  Cloud sync paused due to high traffic. Retrying in {rateLimitStatus.retryAfter}s...

                </div>

              </div>

              <div className="shrink-0">

                <RefreshCw className="w-3.5 h-3.5 animate-spin opacity-50" />

              </div>

            </div>

          </div>

        )}



        {/* Real-time Supabase Cloud Sync & Error Feedback Bar */}

        {/* Real-time Supabase Cloud Notification Bar */}
        {syncNotification && (
          <div className="max-w-6xl mx-auto transition-all animate-in fade-in slide-in-from-top-2 duration-300">
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 shadow-md ${
              syncNotification.type === 'syncing'
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : syncNotification.type === 'synced'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : syncNotification.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                {syncNotification.type === 'syncing' && <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-blue-500" />}
                {syncNotification.type === 'synced' && <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />}
                {syncNotification.type === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />}
                {syncNotification.type === 'error' && <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />}
                <div className="truncate text-xs font-semibold">
                  <span>{syncNotification.message}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={clearSyncNotification}
                className="p-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full"
          >

        {activeTab === 'settings' && (

          <div className="space-y-6 max-w-6xl mx-auto">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              <div>

                <h1 className={`text-2xl font-extrabold tracking-tight ${textTitle}`}>Admin Settings & Store Templates</h1>

                <p className={`text-sm mt-1 ${textSub}`}>Manage client storefront UI templates, announcements, TRA invoice metadata, banking details, and admin theme preferences.</p>

              </div>

            </div>



            <form onSubmit={handleSaveSettings} className="space-y-6">

              {/* Client App UI Templates & Banners */}

              <div className={`p-6 rounded-2xl border ${cardBg}`}>

                <div className="flex items-center gap-2 pb-4 mb-6 border-b border-slate-200 dark:border-slate-800">

                  <Sparkles className="w-5 h-5 text-blue-500" />

                  <h3 className={`font-bold text-base ${textTitle}`}>Client Storefront UI Templates & Banners</h3>

                </div>



                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                  {/* Left Column: Form Editor */}

                  <div className="lg:col-span-5 space-y-5">

                    <div className="space-y-4">

                      <div>

                        <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Announcement Bar Text</label>

                        <input

                          type="text"

                          value={settingsForm.announcementText}

                          onChange={(e) => setSettingsForm({ ...settingsForm, announcementText: e.target.value })}

                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${inputBg}`}

                        />

                      </div>

                      <div className="flex items-center pt-2">

                        <label className="flex items-center gap-3 cursor-pointer">

                          <input

                            type="checkbox"

                            checked={settingsForm.showAnnouncement}

                            onChange={(e) => setSettingsForm({ ...settingsForm, showAnnouncement: e.target.checked })}

                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"

                          />

                          <span className={`text-xs font-bold ${textTitle}`}>Show Announcement Banner on Client App</span>

                        </label>

                      </div>



                      <div className="grid grid-cols-2 gap-4">

                        <div>

                          <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Primary Brand Color</label>

                          <div className="flex gap-2">

                            <input

                              type="color"

                              value={settingsForm.primaryColor || '#2563eb'}

                              onChange={(e) => setSettingsForm({ ...settingsForm, primaryColor: e.target.value })}

                              className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-900 shrink-0"

                            />

                            <input

                              type="text"

                              value={settingsForm.primaryColor || '#2563eb'}

                              onChange={(e) => setSettingsForm({ ...settingsForm, primaryColor: e.target.value })}

                              className={`w-full px-3 py-2 rounded-lg border text-xs font-medium uppercase ${inputBg}`}

                            />

                          </div>

                        </div>

                        <div>

                          <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Font Family</label>

                          <select

                            value={settingsForm.fontFamily || 'Inter, sans-serif'}

                            onChange={(e) => setSettingsForm({ ...settingsForm, fontFamily: e.target.value })}

                            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${inputBg}`}

                            style={{ fontFamily: settingsForm.fontFamily || 'Inter, sans-serif' }}

                          >

                            <option value="Inter, sans-serif" style={{ fontFamily: 'Inter, sans-serif' }}>Inter (Sans)</option>

                            <option value="'Plus Jakarta Sans', sans-serif" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Jakarta (Modern)</option>

                            <option value="'Playfair Display', serif" style={{ fontFamily: "'Playfair Display', serif" }}>Playfair (Elegant Serif)</option>

                            <option value="'Poppins', sans-serif" style={{ fontFamily: "'Poppins', sans-serif" }}>Poppins (Friendly)</option>

                            <option value="'Cinzel', serif" style={{ fontFamily: "'Cinzel', serif" }}>Cinzel (Luxury)</option>

                            <option value="ui-monospace, SFMono-Regular, monospace" style={{ fontFamily: "ui-monospace, monospace" }}>Monospace (Tech)</option>

                          </select>

                        </div>



                        {/* Font Style Visual Selector Pills */}

                        <div className="col-span-2 pt-1">

                          <label className={`block text-[11px] font-bold mb-1.5 ${textSub}`}>Font Style Selection & Preview:</label>

                          <div className="grid grid-cols-3 gap-1.5">

                            {[

                              { label: 'Inter', value: 'Inter, sans-serif' },

                              { label: 'Jakarta', value: "'Plus Jakarta Sans', sans-serif" },

                              { label: 'Playfair', value: "'Playfair Display', serif" },

                              { label: 'Poppins', value: "'Poppins', sans-serif" },

                              { label: 'Cinzel', value: "'Cinzel', serif" },

                              { label: 'Mono', value: 'ui-monospace, SFMono-Regular, monospace' },

                            ].map((f) => (

                              <button

                                key={f.label}

                                type="button"

                                onClick={() => setSettingsForm({ ...settingsForm, fontFamily: f.value })}

                                className={`px-2.5 py-2 rounded-xl border text-xs font-medium text-center transition-all ${

                                  (settingsForm.fontFamily || 'Inter, sans-serif') === f.value

                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold shadow-sm ring-1 ring-blue-500'

                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'

                                }`}

                                style={{ fontFamily: f.value }}

                              >

                                <span className="text-sm block font-bold leading-tight">Aa</span>

                                <span className="text-[10px] opacity-80">{f.label}</span>

                              </button>

                            ))}

                          </div>

                        </div>

                      </div>



                      <div>

                        <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Hero Section Badge</label>

                        <input

                          type="text"

                          value={settingsForm.heroBadge}

                          onChange={(e) => setSettingsForm({ ...settingsForm, heroBadge: e.target.value })}

                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${inputBg}`}

                        />

                      </div>

                      <div>

                        <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Hero Main Title</label>

                        <input

                          type="text"

                          value={settingsForm.heroTitle}

                          onChange={(e) => setSettingsForm({ ...settingsForm, heroTitle: e.target.value })}

                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${inputBg}`}

                        />

                      </div>

                      <div>

                        <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Hero Subtitle Description</label>

                        <textarea

                          rows={2}

                          value={settingsForm.heroSubtitle}

                          onChange={(e) => setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })}

                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${inputBg}`}

                        />

                      </div>

                      

                      {/* Local File Storage Hero Image Upload */}

                      <div className="space-y-2 pt-1">

                        <label className={`block text-xs font-bold ${textSub}`}>Hero Background Image</label>

                        

                        {isHeroUploading ? (

                          <div className="relative rounded-2xl border-2 border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 p-6 flex flex-col items-center justify-center text-center animate-pulse min-h-[140px] shadow-lg shadow-blue-500/10">

                            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/30 mb-2">

                              <RefreshCw className="w-6 h-6 animate-spin" />

                            </div>

                            <span className="text-xs font-black text-blue-600 dark:text-blue-400">Uploading Image...</span>

                            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Compressed & Uploaded</span>

                          </div>

                        ) : settingsForm.heroImage ? (

                          <div className="relative rounded-xl group bg-transparent p-2 transition-all flex items-center justify-center min-h-[120px]">

                            <img

                              src={settingsForm.heroImage}

                              alt="Hero Background Preview"

                              className="w-auto h-auto max-h-36 max-w-full object-contain mx-auto"

                            />

                            <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2 p-3 backdrop-blur-[2px]">

                              <label className="cursor-pointer bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold px-3 py-1.5 rounded-lg shadow flex items-center gap-1.5">

                                <Upload className="w-3.5 h-3.5 text-blue-600" />

                                Upload Local Image from Device

                                <input

                                  type="file"

                                  accept="image/*"

                                  className="hidden"

                                  onChange={async (e) => {

                                    const file = e.target.files?.[0];

                                    if (file) {

                                      setIsHeroUploading(true);

                                      try {

                                        const url = await processAndUploadImage(file, settingsForm.heroImage);

                                        setSettingsForm((prev) => ({ ...prev, heroImage: url }));

                                      } catch (err: any) {

                                        console.error('Image upload error:', err);

                                        alert(err.message || 'Image upload failed');

                                      } finally {

                                        setIsHeroUploading(false);

                                      }

                                    }

                                  }}

                                />

                              </label>

                              <button

                                type="button"

                                onClick={() => {

                                  setSettingsForm({ ...settingsForm, heroImage: '' });

                                }}

                                className="bg-red-600 text-white hover:bg-red-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow flex items-center gap-1.5"

                              >

                                <Trash2 className="w-3.5 h-3.5" />

                                Remove

                              </button>

                            </div>

                          </div>

                        ) : (

                          <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-50 dark:bg-slate-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 group text-center">

                            <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors mb-2" />

                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">

                              Upload Local Image from Device

                            </span>

                            <span className="text-[10px] text-slate-400 mt-1">

                              Compressed & Uploaded

                            </span>

                            <input

                              type="file"

                              accept="image/*"

                              className="hidden"

                              onChange={async (e) => {

                                const file = e.target.files?.[0];

                                if (file) {

                                  setIsHeroUploading(true);

                                  try {

                                    const url = await processAndUploadImage(file, settingsForm.heroImage);

                                    setSettingsForm((prev) => ({ ...prev, heroImage: url }));

                                  } catch (err: any) {

                                    console.error('Image upload error:', err);

                                    alert(err.message || 'Image upload failed');

                                  } finally {

                                    setIsHeroUploading(false);

                                  }

                                }

                              }}

                            />

                          </label>

                        )}



                        {/* Optional URL input / presets toggle */}

                        <div className="pt-1">

                          <details className="text-xs">

                            <summary className="cursor-pointer text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium text-[11px] select-none">

                              Or enter image URL / Choose Preset

                            </summary>

                            <div className="mt-2 space-y-2">

                              <input

                                type="url"

                                placeholder="https://images.unsplash.com/..."

                                value={settingsForm.heroImage || ''}

                                onChange={(e) => setSettingsForm({ ...settingsForm, heroImage: e.target.value })}

                                className={`w-full px-3 py-2 rounded-lg border text-xs font-medium ${inputBg}`}

                              />

                              <div className="flex gap-1.5 flex-wrap">

                                {[

                                  { label: 'Modern Studio', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800' },

                                  { label: 'Tech Display', url: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&q=80&w=800' },

                                  { label: 'Minimal Workspace', url: 'https://images.unsplash.com/photo-1491933382434-500287f9b54b?auto=format&fit=crop&q=80&w=800' },

                                ].map((preset) => (

                                  <button

                                    key={preset.label}

                                    type="button"

                                    onClick={() => setSettingsForm({ ...settingsForm, heroImage: preset.url })}

                                    className="text-[10px] font-semibold px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"

                                  >

                                    {preset.label}

                                  </button>

                                ))}

                              </div>

                            </div>

                          </details>

                        </div>

                      </div>

                    </div>

                  </div>



                  {/* Right Column: Sticky Template Preview */}

                  <div className="lg:col-span-7 lg:sticky lg:top-6">

                    <TemplatePreview 

                      settings={settingsForm} 

                      onLayoutChange={(layout) => {

                        const updated = { ...settingsForm, heroLayout: layout };

                        setSettingsForm(updated);

                        if (onUpdateStoreSettings) onUpdateStoreSettings(updated);

                      }} 

                    />

                  </div>

                </div>

              </div>



              {/* Invoice & Payment Information */}

              <div className={`p-6 rounded-2xl border space-y-4 ${cardBg}`}>

                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">

                  <ShieldCheck className="w-5 h-5 text-emerald-500" />

                  <h3 className={`font-bold text-base ${textTitle}`}>TRA Invoice & Payment Info</h3>

                </div>



                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div>

                    <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Store Business Name</label>

                    <input

                      type="text"

                      value={settingsForm.storeName}

                      onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}

                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${inputBg}`}

                    />

                  </div>

                  <div>

                    <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Tagline / Description</label>

                    <input

                      type="text"

                      value={settingsForm.tagline}

                      onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}

                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${inputBg}`}

                    />

                  </div>



                  <div>

                    <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>TIN (Tax Identification Number)</label>

                    <input

                      type="text"

                      value={settingsForm.tin}

                      onChange={(e) => setSettingsForm({ ...settingsForm, tin: e.target.value })}

                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${inputBg}`}

                    />

                  </div>

                  <div>

                    <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>VRN (VAT Registration Number)</label>

                    <input

                      type="text"

                      value={settingsForm.vrn}

                      onChange={(e) => setSettingsForm({ ...settingsForm, vrn: e.target.value })}

                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${inputBg}`}

                    />

                  </div>



                  <div>

                    <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Global VAT Percentage (%)</label>

                    <input

                      type="number"

                      step="0.1"

                      min="0"

                      max="100"

                      value={settingsForm.vatPercentage ?? 18}

                      onChange={(e) => setSettingsForm({ ...settingsForm, vatPercentage: parseFloat(e.target.value) || 0 })}

                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${inputBg}`}

                      placeholder="18"

                    />

                    <span className="text-[10px] text-slate-500 block mt-1">Global VAT rate saved in database and applied across invoices, POS receipts, & storefront.</span>

                  </div>



                  <div className="md:col-span-2">

                    <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Physical Address / Location</label>

                    <input

                      type="text"

                      value={settingsForm.address}

                      onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}

                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${inputBg}`}

                    />

                  </div>



                  <div>

                    <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Support Phone Number</label>

                    <input

                      type="text"

                      value={settingsForm.phone}

                      onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}

                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${inputBg}`}

                    />

                  </div>

                  <div>

                    <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Support Email</label>

                    <input

                      type="text"

                      value={settingsForm.email}

                      onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}

                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${inputBg}`}

                    />

                  </div>

                  <div>

                    <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>WhatsApp Support Number</label>

                    <input

                      type="text"

                      value={settingsForm.whatsappNumber}

                      onChange={(e) => setSettingsForm({ ...settingsForm, whatsappNumber: e.target.value })}

                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${inputBg}`}

                    />

                  </div>



                </div>

              </div>

              {/* Database & Catalog Maintenance */}
              <div className={`p-6 rounded-2xl border space-y-4 ${cardBg}`}>
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <Database className="w-5 h-5 text-indigo-500" />
                  <h3 className={`font-bold text-base ${textTitle}`}>Catalog & Database Maintenance</h3>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className={`text-sm font-bold ${textTitle}`}>Bulk Brand Name Cleanup</h4>
                    <p className={`text-xs mt-1 ${textSub}`}>Standardizes misspellings, fixes casing (e.g. "samsung electronics" &rarr; "Samsung"), and merges duplicate tags across all products.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBrandCleanup}
                    disabled={isCleaningBrands}
                    className="shrink-0 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCleaningBrands ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Tags className="w-4 h-4" />}
                    <span>{isCleaningBrands ? 'Cleaning...' : 'Run Brand Cleanup'}</span>
                  </button>
                </div>
              </div>

              {/* Payment Methods */}

              <div className={`p-6 rounded-2xl border space-y-4 ${cardBg}`}>

                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">

                  <div className="flex items-center gap-2">

                    <DollarSign className="w-5 h-5 text-emerald-500" />

                    <h3 className={`font-bold text-base ${textTitle}`}>Payment Methods</h3>

                  </div>

                  <button

                    type="button"

                    onClick={() => {

                      const newMethods = [...(settingsForm.paymentMethods || [])];

                      newMethods.push({

                        id: Math.random().toString(36).substr(2, 9),

                        type: 'Bank Transfer',

                        provider: 'New Bank',

                        accountName: '',

                        accountNumber: '',

                        isActive: true

                      });

                      setSettingsForm({ ...settingsForm, paymentMethods: newMethods });

                    }}

                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2"

                  >

                    <Plus className="w-4 h-4" />

                    Add Method

                  </button>

                </div>



                <div className="space-y-4">

                  {(settingsForm.paymentMethods || []).map((method, index) => (

                    <div key={method.id} className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">

                        <div>

                          <label className={`block text-xs font-bold mb-1 ${textSub}`}>Type</label>

                          <select

                            value={method.type}

                            onChange={(e) => {

                              const newMethods = [...settingsForm.paymentMethods!];

                              newMethods[index] = { ...newMethods[index], type: e.target.value as any };

                              setSettingsForm({ ...settingsForm, paymentMethods: newMethods });

                            }}

                            className={`w-full px-3 py-2 rounded-lg border text-xs font-medium ${inputBg}`}

                          >

                            <option value="Bank Transfer">Bank Transfer</option>

                            <option value="Mobile Money">Mobile Money</option>

                            <option value="Merchant Pay">Merchant Pay</option>

                            <option value="Orbi Pay">Orbi Pay</option>

                            <option value="Other">Other</option>

                          </select>

                        </div>

                        <div>

                          <label className={`block text-xs font-bold mb-1 ${textSub}`}>Provider (e.g. CRDB, M-Pesa)</label>

                          <input

                            type="text"

                            value={method.provider}

                            onChange={(e) => {

                              const newMethods = [...settingsForm.paymentMethods!];

                              newMethods[index] = { ...newMethods[index], provider: e.target.value };

                              setSettingsForm({ ...settingsForm, paymentMethods: newMethods });

                            }}

                            className={`w-full px-3 py-2 rounded-lg border text-xs font-medium ${inputBg}`}

                          />

                        </div>

                        <div>

                          <label className={`block text-xs font-bold mb-1 ${textSub}`}>Account Name</label>

                          <input

                            type="text"

                            value={method.accountName}

                            onChange={(e) => {

                              const newMethods = [...settingsForm.paymentMethods!];

                              newMethods[index] = { ...newMethods[index], accountName: e.target.value };

                              setSettingsForm({ ...settingsForm, paymentMethods: newMethods });

                            }}

                            className={`w-full px-3 py-2 rounded-lg border text-xs font-medium ${inputBg}`}

                          />

                        </div>

                        <div>

                          <label className={`block text-xs font-bold mb-1 ${textSub}`}>Account/Till Number</label>

                          <input

                            type="text"

                            value={method.accountNumber}

                            onChange={(e) => {

                              const newMethods = [...settingsForm.paymentMethods!];

                              newMethods[index] = { ...newMethods[index], accountNumber: e.target.value };

                              setSettingsForm({ ...settingsForm, paymentMethods: newMethods });

                            }}

                            className={`w-full px-3 py-2 rounded-lg border text-xs font-medium ${inputBg}`}

                          />

                        </div>

                      </div>

                      

                      <div className="flex items-end gap-4">

                        <div className="flex-1">

                          <label className={`block text-xs font-bold mb-1 ${textSub}`}>Instructions (Optional)</label>

                          <input

                            type="text"

                            value={method.instructions || ''}

                            onChange={(e) => {

                              const newMethods = [...settingsForm.paymentMethods!];

                              newMethods[index] = { ...newMethods[index], instructions: e.target.value };

                              setSettingsForm({ ...settingsForm, paymentMethods: newMethods });

                            }}

                            className={`w-full px-3 py-2 rounded-lg border text-xs font-medium ${inputBg}`}

                          />

                        </div>

                        

                        <div className="flex items-center gap-3">

                          <label className="flex items-center gap-2 cursor-pointer">

                            <input

                              type="checkbox"

                              checked={method.isActive}

                              onChange={(e) => {

                                const newMethods = [...settingsForm.paymentMethods!];

                                newMethods[index] = { ...newMethods[index], isActive: e.target.checked };

                                setSettingsForm({ ...settingsForm, paymentMethods: newMethods });

                              }}

                              className="w-4 h-4 text-blue-600 rounded border-slate-300"

                            />

                            <span className={`text-xs font-bold ${textTitle}`}>Active</span>

                          </label>



                          <button

                            type="button"

                            onClick={() => {

                              const newMethods = settingsForm.paymentMethods!.filter((_, i) => i !== index);

                              setSettingsForm({ ...settingsForm, paymentMethods: newMethods });

                            }}

                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"

                            title="Remove Method"

                          >

                            <Trash2 className="w-4 h-4" />

                          </button>

                        </div>

                      </div>

                    </div>

                  ))}

                  {(!settingsForm.paymentMethods || settingsForm.paymentMethods.length === 0) && (

                    <div className={`p-4 rounded-xl border border-dashed text-center ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-500'}`}>

                      <p className="text-sm">No payment methods configured. Click "Add Method" to add one.</p>

                    </div>

                  )}

                </div>

              </div>



              {/* Cloud Database & Storage Center */}

              <div className={`p-6 rounded-2xl border space-y-6 ${cardBg}`}>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">

                  <div className="flex items-center gap-3">

                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">

                      <Database className="w-5 h-5" />

                    </div>

                    <div>

                      <h3 className={`font-bold text-base ${textTitle}`}>Cloud database Sync</h3>

                      <p className={`text-xs ${textSub}`}>Direct cloud database synchronization, storage bucket inspection, and auto-healing SQL migrations.</p>

                    </div>

                  </div>

                  <div className="flex items-center gap-2">

                    <button

                      type="button"

                      onClick={checkSupabaseHealth}

                      disabled={isCheckingSupabase}

                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 text-slate-700 dark:text-slate-200 transition-all disabled:opacity-50"

                    >

                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingSupabase ? 'animate-spin' : ''}`} />

                      <span>{isCheckingSupabase ? 'Checking Cloud...' : 'Test Connection'}</span>

                    </button>

                  </div>

                </div>



                {/* Cloud Connection Status Banner */}

                <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${

                  supabaseStatus?.connected

                    ? isDark ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'

                    : isDark ? 'bg-amber-950/30 border-amber-800/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'

                }`}>

                  <div className="flex items-center gap-3">

                    <div className={`w-3 h-3 rounded-full shrink-0 ${

                      supabaseStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'

                    }`} />

                    <div>

                      <div className="text-xs font-bold flex items-center gap-2">

                        <span>{supabaseStatus?.connected ? 'Cloud database: Connected & Synced' : supabaseStatus?.configured ? 'Cloud database: Connecting / Initializing' : 'Cloud database: Standby (High-Speed Local Storage Active)'}</span>

                        {supabaseStatus?.url && (

                          <span className="text-[10px] opacity-75 font-mono">({supabaseStatus.url})</span>

                        )}

                      </div>

                      <p className="text-[11px] opacity-85 mt-0.5">

                        {supabaseStatus?.connected

                          ? 'All CRUD operations synchronize in real-time between cloud tables and client browser sessions.'

                          : 'Store is currently operating on high-speed in-memory & local disk persistence. Configure proper cloud environment credentials to enable full backup.'}

                      </p>

                    </div>

                  </div>



                  {supabaseStatus?.storage && (

                    <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-white/10 dark:bg-black/20 border border-white/20">

                      <HardDrive className="w-3.5 h-3.5" />

                      <span>Storage: {supabaseStatus.storage.ok ? 'Bucket Ready' : 'Standby'}</span>

                    </div>

                  )}

                </div>



                {/* Table Sync Matrix */}

                {supabaseStatus?.tables && (

                  <div>

                    <h4 className={`text-xs font-bold mb-2.5 uppercase tracking-wider ${textSub}`}>Cloud Tables Health & Records</h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">

                      {[

                        { key: 'products', name: 'Products', count: products.length },

                        { key: 'categories', name: 'Categories', count: categories?.length || 0 },

                        { key: 'orders', name: 'Orders', count: orders.length },

                        { key: 'posTransactions', name: 'POS Sales', count: posTransactions.length },

                        { key: 'staff', name: 'Staff', count: staff.length },

                        { key: 'profiles', name: 'Profiles', count: profiles?.length || 0 },

                        { key: 'store_settings', name: 'Settings', count: 1 }

                      ].map((tbl) => {

                        const tableInfo = supabaseStatus.tables?.[tbl.key];

                        const isOk = tableInfo?.ok;

                        return (

                          <div

                            key={tbl.key}

                            className={`p-3 rounded-xl border flex flex-col justify-between text-left ${

                              isOk

                                ? isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'

                                : isDark ? 'bg-red-950/20 border-red-900/40 text-red-300' : 'bg-red-50 border-red-200 text-red-700'

                            }`}

                          >

                            <div className="flex items-center justify-between">

                              <span className={`text-[11px] font-bold ${textTitle}`}>{tbl.name}</span>

                              {isOk ? (

                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />

                              ) : (

                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />

                              )}

                            </div>

                            <div className="mt-2 flex items-baseline justify-between text-[10px] text-slate-500">

                              <span>Local: <strong className={`${textTitle}`}>{tbl.count}</strong></span>

                              {tableInfo?.count !== undefined && (

                                <span>Cloud: <strong className="text-emerald-500">{tableInfo.count}</strong></span>

                              )}

                            </div>

                          </div>

                        );

                      })}

                    </div>

                  </div>

                )}





              </div>



              {/* Danger Zone: Data Reset */}

              <div className={`p-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-6 ${cardBg}`}>

                <div className="flex items-center gap-3 pb-4 border-b border-rose-500/10">

                  <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">

                    <AlertTriangle className="w-5 h-5" />

                  </div>

                  <div>

                    <h3 className="font-bold text-base text-rose-500">Danger Zone: Factory Data Reset</h3>

                    <p className={`text-xs ${textSub}`}>Irreversibly delete all records from the marketplace database and local storage.</p>

                  </div>

                </div>



                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

                  <div className="max-w-md">

                    <p className={`text-xs font-medium leading-relaxed ${textSub}`}>

                      This action will clear all <strong>Transactions</strong>, <strong>Online Orders</strong>, <strong>Products</strong>, <strong>Categories</strong>, and <strong>Customer Profiles</strong>. Your account and staff credentials will be preserved if they are synced to Cloud Auth.

                    </p>

                  </div>

                  <button

                    type="button"

                    onClick={handleResetAppData}

                    className="w-full sm:w-auto px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"

                  >

                    <Trash2 className="w-4 h-4" />

                    <span>Reset All Store Data</span>

                  </button>

                </div>

              </div>



              {/* Admin Theme Preferences */}

              <div className={`p-6 rounded-2xl border space-y-4 ${cardBg}`}>

                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">

                  <Monitor className="w-5 h-5 text-indigo-500" />

                  <h3 className={`font-bold text-base ${textTitle}`}>Admin Theme Mode Settings</h3>

                </div>



                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  <button

                    type="button"

                    onClick={() => onSetAdminThemeMode && onSetAdminThemeMode('system')}

                    className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all ${

                      adminThemeMode === 'system'

                        ? 'border-blue-600 bg-blue-500/10 text-blue-400 font-bold'

                        : 'border-slate-700 hover:bg-slate-800 text-slate-400'

                    }`}

                  >

                    <Monitor className="w-5 h-5" />

                    <div>

                      <div className="text-xs font-bold">System Auto</div>

                      <div className="text-[10px] text-slate-500">Matches OS appearance</div>

                    </div>

                  </button>



                  <button

                    type="button"

                    onClick={() => onSetAdminThemeMode && onSetAdminThemeMode('dark')}

                    className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all ${

                      adminThemeMode === 'dark'

                        ? 'border-blue-600 bg-blue-500/10 text-blue-400 font-bold'

                        : 'border-slate-700 hover:bg-slate-800 text-slate-400'

                    }`}

                  >

                    <Moon className="w-5 h-5" />

                    <div>

                      <div className="text-xs font-bold">Always Dark</div>

                      <div className="text-[10px] text-slate-500">Dark twilight slate mode</div>

                    </div>

                  </button>



                  <button

                    type="button"

                    onClick={() => onSetAdminThemeMode && onSetAdminThemeMode('light')}

                    className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all ${

                      adminThemeMode === 'light'

                        ? 'border-blue-600 bg-blue-500/10 text-blue-400 font-bold'

                        : 'border-slate-700 hover:bg-slate-800 text-slate-400'

                    }`}

                  >

                    <Sun className="w-5 h-5" />

                    <div>

                      <div className="text-xs font-bold">Always Light</div>

                      <div className="text-[10px] text-slate-500">Clean high-contrast mode</div>

                    </div>

                  </button>

                </div>

              </div>



              <div className="flex justify-end gap-3 pt-2">

                <button

                  type="submit"

                  disabled={isSavingSettings}

                  title={`Save Store Settings (${isMac ? '⌘S' : 'Ctrl+S'})`}

                  className={`${settingsSaved ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'} text-white font-bold px-6 py-3 rounded-xl text-xs shadow-lg transition-all flex items-center gap-2 active:scale-95 disabled:opacity-75 cursor-pointer`}

                >

                  {isSavingSettings ? (

                    <RefreshCw className="w-4 h-4 animate-spin" />

                  ) : settingsSaved ? (

                    <Check className="w-4 h-4" />

                  ) : (

                    <Globe className="w-4 h-4" />

                  )}

                  <span>{isSavingSettings ? 'Publishing Globally...' : settingsSaved ? 'Saved & Synced Globally to All Devices!' : 'Save & Publish All Store Settings'}</span>

                  <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 rounded">

                    {isMac ? '⌘S' : 'Ctrl+S'}

                  </kbd>

                </button>

              </div>

            </form>

          </div>

        )}



        {activeTab === 'dashboard' && (

          <div className="space-y-8">

            <div>

              <h1 className={`text-2xl font-extrabold tracking-tight ${textTitle}`}>Dashboard & Sales Analytics</h1>

              <p className={`text-sm mt-1 ${textSub}`}>Real-time overview of marketplace revenue, genuine stock levels, and POS transactions.</p>

            </div>



            {/* Metric Cards */}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">

              <div className={`p-5 lg:p-6 rounded-2xl border flex flex-col justify-between transition-all min-w-0 ${cardBg}`}>

                <div className="flex items-center justify-between gap-2 mb-2">

                  <span className={`text-xs font-bold uppercase tracking-wider truncate ${textSub}`}>Total Revenue</span>

                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl shrink-0">

                    <DollarSign className="w-5 h-5" />

                  </div>

                </div>

                <div className="min-w-0">

                  <div className={`text-lg sm:text-xl lg:text-2xl 2xl:text-3xl font-black leading-tight tracking-tight whitespace-nowrap truncate ${textTitle}`} title={formatTZS(totalRevenue)}>

                    {formatTZS(totalRevenue)}

                  </div>

                  <span className={`text-xs ${Number(growthLastMonth) >= 0 ? 'text-emerald-500' : 'text-rose-500'} font-semibold flex items-center gap-1 mt-1 truncate`}>

                    <ArrowUpRight className="w-3.5 h-3.5 shrink-0" /> {Number(growthLastMonth) >= 0 ? '+' : ''}{growthLastMonth}% from last month

                  </span>

                </div>

              </div>



              <div className={`p-5 lg:p-6 rounded-2xl border flex flex-col justify-between transition-all min-w-0 ${cardBg}`}>

                <div className="flex items-center justify-between gap-2 mb-2">

                  <span className={`text-xs font-bold uppercase tracking-wider truncate ${textSub}`}>Inventory Valuation</span>

                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl shrink-0">

                    <Package className="w-5 h-5" />

                  </div>

                </div>

                <div className="min-w-0">

                  <div className={`text-lg sm:text-xl lg:text-2xl 2xl:text-3xl font-black leading-tight tracking-tight whitespace-nowrap truncate ${textTitle}`} title={formatTZS(totalInventoryValue)}>

                    {formatTZS(totalInventoryValue)}

                  </div>

                  <span className={`text-xs font-medium mt-1 truncate block ${textSub}`}>{products.reduce((a, c) => a + c.stock, 0)} units in stock</span>

                </div>

              </div>



              <div className={`p-5 lg:p-6 rounded-2xl border flex flex-col justify-between transition-all min-w-0 ${cardBg}`}>

                <div className="flex items-center justify-between gap-2 mb-2">

                  <span className={`text-xs font-bold uppercase tracking-wider truncate ${textSub}`}>Online Orders</span>

                  <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl shrink-0">

                    <ShoppingCart className="w-5 h-5" />

                  </div>

                </div>

                <div className="min-w-0">

                  <div className={`text-2xl sm:text-3xl font-black ${textTitle}`}>{orders.length}</div>

                  <span className="text-xs text-blue-500 font-semibold mt-1 truncate block">Pending fulfillment: {orders.filter(o => o.status === 'Processing').length}</span>

                </div>

              </div>



              <div className={`p-5 lg:p-6 rounded-2xl border flex flex-col justify-between transition-all min-w-0 ${cardBg}`}>

                <div className="flex items-center justify-between gap-2 mb-2">

                  <span className={`text-xs font-bold uppercase tracking-wider truncate ${textSub}`}>Out of Stock Alerts</span>

                  <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl shrink-0">

                    <AlertTriangle className="w-5 h-5" />

                  </div>

                </div>

                <div className="min-w-0">

                  <div className={`text-2xl sm:text-3xl font-black ${textTitle}`}>{lowStockProducts.length}</div>

                  <span className="text-xs text-rose-500 font-semibold mt-1 truncate block">Stock &lt; 1 (Sales blocked)</span>

                </div>

              </div>

            </div>



            {/* Sales Revenue Trends Analytics Dashboard Chart with High-Visibility Dropdown Filter */}

            <div className={`rounded-3xl border p-6 transition-all ${cardBg}`}>

              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">

                <div>

                  <div className="flex items-center gap-2 flex-wrap">

                    <h3 className={`text-lg font-extrabold tracking-tight ${textTitle}`}>

                      {chartTimeframe === 'daily' && 'Daily Sales Revenue Trends'}

                      {chartTimeframe === 'weekly' && 'Weekly Sales Revenue Trends'}

                      {chartTimeframe === 'yearly' && 'Yearly Sales Revenue Performance'}

                    </h3>

                  </div>

                  <p className={`text-xs mt-0.5 ${textSub}`}>

                    {chartTimeframe === 'daily' && 'Real-time daily revenue breakdown across POS terminal transactions and online store orders'}

                    {chartTimeframe === 'weekly' && 'Weekly aggregated revenue performance across POS terminal transactions and online store orders'}

                    {chartTimeframe === 'yearly' && 'Annual aggregated revenue trajectory comparing multi-year store performance'}

                  </p>

                </div>



                <div className="flex flex-wrap items-center gap-3">

                  {/* Quick Pill Buttons */}

                  <div className={`p-1 rounded-xl border flex items-center gap-1 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>

                    <button

                      onClick={() => setChartTimeframe('daily')}

                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${

                        chartTimeframe === 'daily'

                          ? 'bg-blue-600 text-white shadow-sm'

                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'

                      }`}

                    >

                      Daily

                    </button>

                    <button

                      onClick={() => setChartTimeframe('weekly')}

                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${

                        chartTimeframe === 'weekly'

                          ? 'bg-blue-600 text-white shadow-sm'

                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'

                      }`}

                    >

                      Weekly

                    </button>

                    <button

                      onClick={() => setChartTimeframe('yearly')}

                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${

                        chartTimeframe === 'yearly'

                          ? 'bg-blue-600 text-white shadow-sm'

                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'

                      }`}

                    >

                      Yearly

                    </button>

                  </div>



                  {/* Legends */}

                  <div className="flex items-center gap-4 text-xs font-semibold">

                    <div className={`flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>

                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Online

                    </div>

                    <div className={`flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>

                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> POS

                    </div>

                    {chartTimeframe === 'weekly' && (

                      <div className={`flex items-center gap-1.5 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>

                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50"></span> Weekly Trend Line

                      </div>

                    )}

                  </div>

                </div>

              </div>



              {/* Dynamic Quick Metrics Banner based on Dropdown Filter */}

              {(() => {

                const currentDataset = salesTrendData[chartTimeframe === 'daily' ? 'days' : chartTimeframe === 'weekly' ? 'weeks' : 'years'];

                let totalPeriodRev = 0;

                let totalTx = 0;

                for (const d of currentDataset as any[]) {

                  totalPeriodRev += d.revenue || 0;

                  totalTx += d.transactions || 0;

                }

                const peakRev = currentDataset.length > 0 ? Math.max(...currentDataset.map(d => d.revenue)) : 0;

                const avgRev = Math.round(totalPeriodRev / (currentDataset.length || 1));

                const latestRev = (currentDataset[currentDataset.length - 1] as any)?.revenue || 0;

                const avgTxs = Math.round(totalTx / (currentDataset.length || 1));



                return (

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 p-3.5 rounded-2xl border bg-blue-500/5 border-blue-500/10">

                    <div>

                      <span className={`text-[10px] uppercase font-bold tracking-wider ${textSub}`}>

                        {chartTimeframe === 'daily' ? "Today's Revenue" : chartTimeframe === 'weekly' ? "This Week's Revenue" : "This Year's Revenue"}

                      </span>

                      <div className="text-sm font-black text-blue-500">{formatTZS(latestRev)}</div>

                    </div>

                    <div>

                      <span className={`text-[10px] uppercase font-bold tracking-wider ${textSub}`}>

                        {chartTimeframe === 'daily' ? "7-Day Peak" : chartTimeframe === 'weekly' ? "4-Week Peak" : "Multi-Year Peak"}

                      </span>

                      <div className="text-sm font-black text-emerald-500">{formatTZS(peakRev)}</div>

                    </div>

                    <div>

                      <span className={`text-[10px] uppercase font-bold tracking-wider ${textSub}`}>

                        {chartTimeframe === 'daily' ? "Daily Average" : chartTimeframe === 'weekly' ? "Weekly Average" : "Yearly Average"}

                      </span>

                      <div className={`text-sm font-black ${textTitle}`}>{formatTZS(avgRev)}</div>

                    </div>

                    <div>

                      <span className={`text-[10px] uppercase font-bold tracking-wider ${textSub}`}>

                        Avg Sales Volume

                      </span>

                      <div className="text-sm font-black text-indigo-400">

                        {avgTxs} {chartTimeframe === 'daily' ? 'sales/day' : chartTimeframe === 'weekly' ? 'sales/week' : 'sales/year'}

                      </div>

                    </div>

                  </div>

                );

              })()}



              <div className="w-full h-[350px] min-h-[350px]">

                <ResponsiveContainer width="100%" height={350}>

                  {chartTimeframe === 'weekly' ? (

                    <ComposedChart

                      data={salesTrendData.weeks}

                      margin={{ top: 15, right: 15, left: 0, bottom: 0 }}

                    >

                      <defs>

                        <linearGradient id="weeklyOnlineGrad" x1="0" y1="0" x2="0" y2="1">

                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.45} />

                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />

                        </linearGradient>

                        <linearGradient id="weeklyPosGrad" x1="0" y1="0" x2="0" y2="1">

                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />

                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />

                        </linearGradient>

                        <linearGradient id="weeklyTotalGrad" x1="0" y1="0" x2="0" y2="1">

                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />

                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />

                        </linearGradient>

                      </defs>

                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />

                      <XAxis dataKey="label" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} />

                      <YAxis

                        stroke={isDark ? '#64748b' : '#94a3b8'}

                        fontSize={11}

                        tickLine={false}

                        axisLine={false}

                        tickFormatter={(v) => {

                          if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`;

                          if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;

                          if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;

                          return `${v}`;

                        }}

                      />

                      <Tooltip

                        cursor={{ stroke: isDark ? '#334155' : '#cbd5e1', strokeDasharray: '4 4' }}

                        content={({ active, payload }) => {

                          if (active && payload && payload.length) {

                            const data = payload[0].payload;

                            return (

                              <div className={`p-3.5 rounded-2xl border shadow-2xl text-xs space-y-2 min-w-[200px] ${

                                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'

                              }`}>

                                <div className="font-extrabold border-b pb-1.5 border-slate-700 flex justify-between items-center text-sm">

                                  <span>{data.fullLabel || data.label}</span>

                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 font-bold">{data.transactions} sales</span>

                                </div>

                                <div className="flex justify-between items-center text-blue-400 font-semibold">

                                  <span>Online Store:</span>

                                  <span className="font-bold">{formatTZS(data.onlineRevenue)}</span>

                                </div>

                                <div className="flex justify-between items-center text-emerald-400 font-semibold">

                                  <span>POS Terminal:</span>

                                  <span className="font-bold">{formatTZS(data.posRevenue)}</span>

                                </div>

                                <div className="flex justify-between items-center pt-1.5 border-t border-slate-700 font-black text-sm">

                                  <span className="text-purple-400">Combined Total:</span>

                                  <span className="text-purple-400">{formatTZS(data.revenue)}</span>

                                </div>

                              </div>

                            );

                          }

                          return null;

                        }}

                      />

                      <Area type="monotone" dataKey="onlineRevenue" name="Online Store" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#weeklyOnlineGrad)" />

                      <Area type="monotone" dataKey="posRevenue" name="POS Terminal" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#weeklyPosGrad)" />

                      <Line type="monotone" dataKey="revenue" name="Total Weekly Trend" stroke="#8b5cf6" strokeWidth={3.5} dot={{ r: 6, fill: '#8b5cf6', stroke: '#ffffff', strokeWidth: 2 }} activeDot={{ r: 9, strokeWidth: 3 }} />

                    </ComposedChart>

                  ) : chartTimeframe === 'yearly' ? (

                    <AreaChart

                      data={salesTrendData.years}

                      margin={{ top: 15, right: 15, left: 0, bottom: 0 }}

                    >

                      <defs>

                        <linearGradient id="yearlyTotalGrad" x1="0" y1="0" x2="0" y2="1">

                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />

                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01} />

                        </linearGradient>

                      </defs>

                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />

                      <XAxis dataKey="label" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} />

                      <YAxis

                        stroke={isDark ? '#64748b' : '#94a3b8'}

                        fontSize={11}

                        tickLine={false}

                        axisLine={false}

                        tickFormatter={(v) => {

                          if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`;

                          if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;

                          return `${v}`;

                        }}

                      />

                      <Tooltip

                        content={({ active, payload }) => {

                          if (active && payload && payload.length) {

                            const data = payload[0].payload;

                            return (

                              <div className={`p-3.5 rounded-2xl border shadow-2xl text-xs space-y-1.5 min-w-[190px] ${

                                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'

                              }`}>

                                <div className="font-extrabold border-b pb-1 border-slate-700 flex justify-between items-center text-sm">

                                  <span>{data.fullLabel}</span>

                                  <span className="text-[10px] text-blue-400 font-bold">{data.transactions} sales</span>

                                </div>

                                <div className="flex justify-between items-center text-blue-400 font-semibold">

                                  <span>Online Channel:</span>

                                  <span className="font-bold">{formatTZS(data.onlineRevenue)}</span>

                                </div>

                                <div className="flex justify-between items-center text-emerald-400 font-semibold">

                                  <span>POS Channel:</span>

                                  <span className="font-bold">{formatTZS(data.posRevenue)}</span>

                                </div>

                                <div className="flex justify-between items-center pt-1 border-t border-slate-700 font-black text-sm">

                                  <span>Total Yearly:</span>

                                  <span className="text-blue-500">{formatTZS(data.revenue)}</span>

                                </div>

                              </div>

                            );

                          }

                          return null;

                        }}

                      />

                      <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#yearlyTotalGrad)" dot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} />

                    </AreaChart>

                  ) : (

                    <BarChart

                      data={salesTrendData.days}

                      margin={{ top: 15, right: 10, left: 0, bottom: 0 }}

                    >

                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#1e293b' : '#f1f5f9'} />

                      <XAxis dataKey="label" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={12} tickLine={false} />

                      <YAxis

                        stroke={isDark ? '#64748b' : '#94a3b8'}

                        fontSize={11}

                        tickLine={false}

                        axisLine={false}

                        tickFormatter={(v) => {

                          if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B`;

                          if (v >= 1000000) return `${(v / 1000000).toFixed(0)}M`;

                          if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;

                          return `${v}`;

                        }}

                      />

                      <Tooltip

                        cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)' }}

                        content={({ active, payload }) => {

                          if (active && payload && payload.length) {

                            const data = payload[0].payload;

                            return (

                              <div className={`p-3 rounded-xl border shadow-xl text-xs space-y-1.5 min-w-[180px] ${

                                isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'

                              }`}>

                                <div className="font-bold border-b pb-1 border-slate-700 flex justify-between items-center">

                                  <span>{data.fullLabel || data.label}</span>

                                  <span className="text-[10px] text-blue-400 font-normal">{data.transactions} sales</span>

                                </div>

                                <div className="flex justify-between items-center text-blue-400 font-medium">

                                  <span>Online Store:</span>

                                  <span className="font-bold">{formatTZS(data.onlineRevenue)}</span>

                                </div>

                                <div className="flex justify-between items-center text-emerald-400 font-medium">

                                  <span>POS Terminal:</span>

                                  <span className="font-bold">{formatTZS(data.posRevenue)}</span>

                                </div>

                                <div className="flex justify-between items-center pt-1 border-t border-slate-700 font-black text-white">

                                  <span>Total Revenue:</span>

                                  <span className="text-blue-500">{formatTZS(data.revenue)}</span>

                                </div>

                              </div>

                            );

                          }

                          return null;

                        }}

                      />

                      <Bar dataKey="onlineRevenue" name="Online Store" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />

                      <Bar dataKey="posRevenue" name="POS Terminal" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />

                    </BarChart>

                  )}

                </ResponsiveContainer>

              </div>

            </div>

            {/* Visitor Activity Heatmap Section on Admin Dashboard */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-base font-extrabold tracking-tight ${textTitle}`}>
                    Store Traffic & Visitor Activity Heatmap
                  </h3>
                  <p className={`text-xs ${textSub}`}>
                    Visual peak hours & days analysis to schedule limited-time promotions and manage server loads.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('visitor-analytics')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Full Visitor Analytics &amp; Logs</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <VisitorActivityHeatmap 
                heatmapData={dashboardVisitorSummary?.activityHeatmap}
                timeframe={heatmapTimeframe}
                onTimeframeChange={setHeatmapTimeframe}
                isDark={isDark}
              />

              {/* Top Viewed Products & Search-to-Product Correlation Breakdown */}
              <TopViewedProductsBreakdown
                products={dashboardVisitorSummary?.topProducts || []}
                onSelectProduct={() => setActiveTab('visitor-analytics')}
                onSelectSearchQuery={() => setActiveTab('visitor-analytics')}
                isDark={isDark}
              />
            </div>

            {/* Unpaid Loans & Debt Dashboard Widget */}
            {(() => {
              const unpaidLoans = (posTransactions || []).filter(tx => {
                if (!tx) return false;
                const pm = String(tx.paymentMethod || '').toLowerCase();
                const isLoan = Boolean(tx.isLoan) || pm.includes('loan') || pm.includes('credit') || pm.includes('mkopo') || pm.includes('debt') || pm.includes('deni');
                return isLoan && (Number(tx.loanBalance) || 0) > 0;
              });
              const totalOutstandingDebt = unpaidLoans.reduce((sum, tx) => sum + (Number(tx.loanBalance) || 0), 0);
              const overdueLoans = unpaidLoans.filter(tx => tx && tx.loanDueDate && !isNaN(new Date(tx.loanDueDate).getTime()) && new Date(tx.loanDueDate) < new Date());
              return (
                <div className={`rounded-3xl border p-6 transition-all ${cardBg}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0">
                        <Banknote className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className={`text-lg font-extrabold tracking-tight ${textTitle}`}>Unpaid Loans & Customer Debt</h3>
                        <p className={`text-xs mt-1 ${textSub}`}>Monitor outstanding POS credit balances and collect repayments.</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('loans')}
                      className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>Manage All Repayments</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Outstanding Debt</span>
                      <div className="text-xl font-black text-amber-500 mt-1 truncate">{formatTZS(totalOutstandingDebt)}</div>
                    </div>
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Debtors</span>
                      <div className={`text-xl font-black mt-1 ${textTitle}`}>{unpaidLoans.length} Customers</div>
                    </div>
                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-rose-950/20 border-rose-900/40' : 'bg-rose-50 border-rose-200'}`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Overdue Payments</span>
                      <div className="text-xl font-black text-rose-600 mt-1">{overdueLoans.length} Loans</div>
                    </div>
                  </div>

                  {unpaidLoans.length > 0 ? (
                    <div className="overflow-x-auto w-full border rounded-2xl">
                      <table className="w-full text-left text-xs min-w-[600px]">
                        <thead>
                          <tr className={`border-b text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-slate-900 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            <th className="p-3">Customer Name</th>
                            <th className="p-3">Phone</th>
                            <th className="p-3">Original Sale</th>
                            <th className="p-3 text-right">Outstanding Debt</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                          {unpaidLoans.slice(0, 5).map(tx => (
                            <tr key={tx.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                              <td className="p-3">
                                <span className="font-bold">{tx.customerName || 'Walk-in Customer'}</span>
                                {tx.loanDueDate && (
                                  <span className={`block text-[10px] mt-0.5 ${new Date(tx.loanDueDate) < new Date() ? 'text-rose-500 font-bold' : 'text-slate-500'}`}>
                                    Due: {new Date(tx.loanDueDate).toLocaleDateString()}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-medium text-slate-500">{tx.customerPhone || 'N/A'}</td>
                              <td className="p-3 font-medium text-slate-500">{formatTZS(tx.total || tx.totalAmount || 0)}</td>
                              <td className="p-3 text-right">
                                <span className="font-black text-amber-500">{formatTZS(tx.loanBalance || 0)}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 border rounded-2xl border-dashed border-slate-300 dark:border-slate-700">
                      <p className="text-xs text-slate-500 font-medium">No unpaid loans or outstanding debt recorded.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Recent Orders & Low Stock Table */}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              <div className={`lg:col-span-2 rounded-2xl border p-6 ${cardBg}`}>

                <h3 className={`text-base font-bold mb-4 ${textTitle}`}>Recent Online Orders</h3>

                <div className="overflow-x-auto w-full">

                  <table className="w-full text-left text-xs min-w-[500px]">

                    <thead>

                      <tr className={`border-b text-xs font-bold uppercase tracking-wider ${tableHeaderBg}`}>

                        <th className="p-3">Order ID</th>

                        <th className="p-3">Customer</th>

                        <th className="p-3">Total</th>

                        <th className="p-3">Status</th>

                        <th className="p-3 text-right">Action</th>

                      </tr>

                    </thead>

                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>

                      {orders.map((o) => (

                        <tr key={o.id} className={`transition-colors ${tableRowHover}`}>

                          <td className={`p-3 font-bold ${textTitle}`}>{o.id}</td>

                          <td className={`p-3 ${textSub}`}>{o.customerName}</td>

                          <td className={`p-3 font-extrabold whitespace-nowrap ${textTitle}`}>{formatTZS(o.totalAmount)}</td>

                          <td className="p-3">

                            <span className={`px-2.5 py-1 rounded-md font-bold text-[11px] border inline-flex items-center gap-1 ${

                              o.status === 'Delivered'

                                ? isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80' : 'bg-emerald-50 text-emerald-700 border-emerald-200'

                                : o.status === 'Shipped'

                                ? isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800/80' : 'bg-blue-50 text-blue-700 border-blue-200'

                                : isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800/80' : 'bg-amber-50 text-amber-700 border-amber-200'

                            }`}>

                              {o.status}

                            </span>

                          </td>

                          <td className="p-3 text-right">

                            <select

                              value={o.status}

                              onChange={(e) => updateOrderStatus(o.id, e.target.value as any)}

                              className={`border rounded-lg px-2 py-1 text-xs font-semibold ${

                                isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-200 text-slate-700'

                              }`}

                            >

                              <option value="Pending">Pending</option>

                              <option value="Processing">Processing</option>

                              <option value="Shipped">Shipped</option>

                              <option value="Delivered">Delivered</option>

                              <option value="Cancelled">Cancelled</option>

                            </select>

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

              </div>



              {/* Out of Stock / Empty Stock Watch */}

              <div className={`rounded-2xl border p-6 ${cardBg}`}>

                <h3 className={`text-base font-bold mb-4 flex items-center gap-2 ${textTitle}`}>

                  <AlertTriangle className="w-5 h-5 text-rose-500" />

                  <span>Empty Stock Watch (Stock &lt; 1)</span>

                </h3>

                {lowStockProducts.length === 0 ? (

                  <p className={`text-xs py-6 text-center ${textSub}`}>All inventory stock levels are healthy (no empty stock).</p>

                ) : (

                  <div className="space-y-3">

                    {lowStockProducts.map((p) => (

                      <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border ${

                        isDark ? 'bg-rose-950/30 border-rose-800/60' : 'bg-rose-50/50 border-rose-200'

                      }`}>

                        <div>

                          <h4 className={`font-bold text-xs line-clamp-1 ${textTitle}`}>{p.name}</h4>

                          <span className="text-[11px] text-rose-500 font-bold">Empty stock: {p.stock} remaining (Cannot sell)</span>

                        </div>

                        <button

                          onClick={() => handleOpenEditModal(p)}

                          className="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow transition-colors"

                        >

                          Restock

                        </button>

                      </div>

                    ))}

                  </div>

                )}

              </div>

            </div>

          </div>

        )}



        {activeTab === 'inventory' && (

          <div className="space-y-6">

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

              <div>

                <h1 className={`text-2xl font-extrabold tracking-tight ${textTitle}`}>Inventory Management</h1>

                <p className={`text-sm mt-1 ${textSub}`}>Manage genuine hardware catalog, SKUs, unique QR codes, and categories.</p>

              </div>

              <div className="flex flex-wrap items-center gap-3">

                <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl mr-2 border border-slate-200 dark:border-slate-800">

                  <button

                    onClick={() => setInventorySubTab('products')}

                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${

                      inventorySubTab === 'products'

                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'

                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'

                    }`}

                  >

                    Products

                  </button>

                  <button

                    onClick={() => setInventorySubTab('categories')}

                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${

                      inventorySubTab === 'categories'

                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'

                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'

                    }`}

                  >

                    Categories

                  </button>

                </div>

                

                {inventorySubTab === 'products' && (

                  <>

                    <button

                      onClick={() => setIsScannerOpen(true)}

                      className={`px-4 py-2.5 rounded-xl font-semibold text-sm border flex items-center gap-2 transition-all ${

                        isDark ? 'bg-indigo-950/60 hover:bg-indigo-900 border-indigo-800 text-indigo-300' : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'

                      }`}

                    >

                      <Scan className="w-4 h-4 text-indigo-400" />

                      <span>Scan QR Code</span>

                    </button>

                    <button

                      onClick={() => setIsBulkQrModalOpen(true)}

                      className={`px-4 py-2.5 rounded-xl font-semibold text-sm border flex items-center gap-2 transition-all ${

                        isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'

                      }`}

                    >

                      <Printer className="w-4 h-4 text-blue-400" />

                      <span>Print All QR Labels</span>

                    </button>

                    <button

                      onClick={() => {
                        triggerHaptic('success');
                        exportProductsToCSV(products);
                      }}

                      className={`px-4 py-2.5 rounded-xl font-semibold text-sm border flex items-center gap-2 transition-all shadow-sm ${

                        isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400' : 'bg-white hover:bg-slate-50 border-slate-200 text-emerald-600'

                      }`}
                      title="Download complete inventory as CSV spreadsheet"

                    >

                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />

                      <span>Export Catalog CSV</span>

                    </button>

                    <button

                      onClick={handleOpenAddModal}

                      title={`Add Genuine Product (${isMac ? '⌘N' : 'Ctrl+N'})`}

                      className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"

                    >

                      <Plus className="w-4 h-4" />

                      <span>Add Genuine Product</span>

                      <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white/20 rounded">

                        {isMac ? '⌘N' : 'Ctrl+N'}

                      </kbd>

                    </button>

                  </>

                )}



                {inventorySubTab === 'categories' && (

                  <div className="flex items-center gap-3">

                    <button

                      onClick={() => setIsCategoryReorderModalOpen(true)}

                      className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"

                    >

                      <List className="w-4 h-4" />

                      <span>Reorder</span>

                    </button>

                    <button

                      onClick={() => {

                        setEditingCategory(null);

                        setCategoryForm({ name: '', swahiliName: '', image: '', description: '' });

                        setIsCategoryModalOpen(true);

                      }}

                      className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all"

                    >

                      <Plus className="w-4 h-4" />

                      <span>Add Category</span>

                    </button>

                  </div>

                )}



              </div>

            </div>



            {inventorySubTab === 'products' && (

            <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>

              <div className="overflow-x-auto w-full">
                {selectedProductIds.size > 0 && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {selectedProductIds.size} products selected
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsBulkStockModalOpen(true)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Adjust Stock ({selectedProductIds.size})</span>
                      </button>
                      <button onClick={handleBulkShare} className="px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-xs">Share</button>
                      <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-xs">Delete</button>
                    </div>
                  </div>
                )}
                <table className="w-full text-left text-xs min-w-[700px]">

                  <thead>

                    <tr className={`border-b text-xs font-bold uppercase tracking-wider ${tableHeaderBg}`}>

                      <th className="p-4 w-10">
                        <input
                          type="checkbox"
                          checked={selectedProductIds.size === products.length && products.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds(new Set(products.map(p => p.id)));
                            } else {
                              setSelectedProductIds(new Set());
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="p-4">Product</th>

                      <th className="p-4">Category</th>

                      <th className="p-4">SKU / Barcode</th>

                      <th className="p-4">Price</th>

                      <th className="p-4">Wholesale</th>

                      <th className="p-4">Cost</th>

                      <th className="p-4">Stock</th>

                      <th className="p-4 text-right">Actions</th>

                    </tr>

                  </thead>

                  <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>

                    {products.map((p) => (

                      <tr key={p.id} className={`transition-colors ${tableRowHover}`}>
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.has(p.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedProductIds);
                              if (e.target.checked) {
                                newSelected.add(p.id);
                              } else {
                                newSelected.delete(p.id);
                              }
                              setSelectedProductIds(newSelected);
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">

                            <img src={p.image} alt={p.name} className={`w-10 h-10 object-cover rounded-xl border shrink-0 ${isDark ? 'border-slate-700' : 'border-slate-200'}`} />

                            <div>

                              <h4 className={`font-bold ${textTitle}`}>{p.name}</h4>

                              <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">

                                <ShieldCheck className="w-3 h-3" /> {p.brand}

                              </span>

                            </div>

                          </div>

                        </td>

                        <td className={`p-4 font-medium whitespace-nowrap ${textSub}`}>{p.category}</td>

                        <td className="p-4 font-mono text-[11px] whitespace-nowrap">

                          <div className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{p.sku}</div>

                          <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{p.barcode}</div>

                        </td>

                        <td className={`p-4 font-extrabold whitespace-nowrap ${textTitle}`}>{formatTZS(p.price)}</td>

                        <td className={`p-4 font-semibold text-purple-500 whitespace-nowrap`}>

                          {p.wholesalePrice ? formatTZS(p.wholesalePrice) : 'Auto'}

                        </td>

                        <td className={`p-4 font-semibold whitespace-nowrap ${textSub}`}>{formatTZS(p.costPrice)}</td>

                        <td className="p-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1.5 min-w-[140px]">
                            {/* Smart Stock Badge */}
                            <span className={`font-bold px-2.5 py-1 rounded-lg border text-[11px] inline-flex items-center gap-1.5 w-fit ${
                              p.stock <= 0
                                ? isDark ? 'bg-rose-950/60 text-rose-300 border-rose-800/80' : 'bg-rose-50 text-rose-700 border-rose-200'
                                : p.stock <= (p.minStockAlert || 3)
                                ? isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800/80' : 'bg-amber-50 text-amber-700 border-amber-200'
                                : isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                p.stock <= 0 ? 'bg-rose-500' : p.stock <= (p.minStockAlert || 3) ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                              }`}></span>
                              <span>
                                {p.stock <= 0 
                                  ? 'Out of Stock (0)' 
                                  : p.stock <= (p.minStockAlert || 3) 
                                  ? `Low Stock (${p.stock})` 
                                  : `In Stock (${p.stock})`}
                              </span>
                            </span>

                            {/* Inline Quick-Adjust Controls */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleQuickStockDelta(p, -1)}
                                disabled={p.stock <= 0}
                                title="Decrease stock by 1"
                                className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs border transition-all ${
                                  p.stock <= 0 
                                    ? 'opacity-40 cursor-not-allowed border-slate-700 text-slate-500' 
                                    : isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95'
                                }`}
                              >
                                -
                              </button>

                              <input
                                type="number"
                                min="0"
                                value={p.stock}
                                onChange={(e) => handleSetExactStock(p, parseInt(e.target.value) || 0)}
                                className={`w-14 text-center py-0.5 px-1 rounded-md text-xs font-mono font-bold border ${inputBg} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                title="Click to directly edit stock quantity"
                              />

                              <button
                                type="button"
                                onClick={() => handleQuickStockDelta(p, 1)}
                                title="Increase stock by 1"
                                className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs border transition-all ${
                                  isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95'
                                }`}
                              >
                                +
                              </button>

                              <button
                                type="button"
                                onClick={() => handleQuickStockDelta(p, 5)}
                                title="Add +5 units batch"
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-colors"
                              >
                                +5
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-right space-x-2 whitespace-nowrap">

                          <button

                            onClick={() => setSelectedQrProduct(p)}

                            className={`p-2 rounded-lg transition-colors ${

                              isDark ? 'bg-blue-950/60 hover:bg-blue-900/80 text-blue-300' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'

                            }`}

                            title="View & Print QR Code"

                          >

                            <QrCode className="w-4 h-4" />

                          </button>

                          <button

                            onClick={() => handleOpenEditModal(p)}

                            className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}

                            title="Edit Product"

                          >

                            <Edit className="w-4 h-4" />

                          </button>

                          <button

                            onClick={() => handleDuplicateProduct(p)}

                            className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'}`}

                            title="Duplicate Product"

                          >

                            <Copy className="w-4 h-4" />

                          </button>

                          <button

                            onClick={() => {

                              showConfirm(

                                'Delete Product',

                                `Are you sure you want to delete product "${p.name}"? This action cannot be undone.`,

                                async () => {

                                  await deleteStorageImage([p.image, ...(p.images || [])]);

                                  deleteProduct(p.id);

                                },

                                'warning'

                              );

                            }}

                            className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-400' : 'bg-rose-50 hover:bg-rose-100 text-rose-600'}`}

                            title="Delete Product"

                          >

                            <Trash2 className="w-4 h-4" />

                          </button>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>

            )}

            {/* Bulk Stock Adjuster Modal */}
            {isBulkStockModalOpen && (
              <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden animate-fadeIn ${
                  isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                }`}>
                  <div className="px-5 py-4 border-b border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm">Bulk Stock Adjuster</h3>
                        <p className="text-[11px] text-slate-400">{selectedProductIds.size} products selected</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBulkStockModalOpen(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Select Action
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setBulkStockAction('add')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            bulkStockAction === 'add'
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                              : isDark ? 'border-slate-800 bg-slate-800/60 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
                          }`}
                        >
                          + Add Stock
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkStockAction('subtract')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            bulkStockAction === 'subtract'
                              ? 'bg-rose-600 border-rose-500 text-white shadow-md'
                              : isDark ? 'border-slate-800 bg-slate-800/60 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
                          }`}
                        >
                          - Subtract
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkStockAction('set')}
                          className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                            bulkStockAction === 'set'
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                              : isDark ? 'border-slate-800 bg-slate-800/60 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
                          }`}
                        >
                          = Set Exact
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Quantity / Units
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          value={bulkStockQuantity}
                          onChange={(e) => setBulkStockQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                          className={`w-full py-2.5 px-3 rounded-xl font-bold text-sm border ${inputBg}`}
                        />
                        <div className="flex gap-1">
                          {[5, 10, 25, 50].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setBulkStockQuantity(num)}
                              className={`px-2 py-1 rounded-lg text-xs font-bold border ${
                                isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        {bulkStockAction === 'add' && `Will increase stock of all ${selectedProductIds.size} products by +${bulkStockQuantity} units.`}
                        {bulkStockAction === 'subtract' && `Will decrease stock of all ${selectedProductIds.size} products by -${bulkStockQuantity} units (min 0).`}
                        {bulkStockAction === 'set' && `Will set stock of all ${selectedProductIds.size} products directly to ${bulkStockQuantity} units.`}
                      </p>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-700/50">
                      <button
                        type="button"
                        onClick={() => setIsBulkStockModalOpen(false)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold ${
                          isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isBulkStockProcessing}
                        onClick={handleBulkStockSubmit}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isBulkStockProcessing ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Apply to {selectedProductIds.size} Items</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

                    {inventorySubTab === 'categories' && (

              <div className="space-y-6">

                {/* Control & Search Bar */}

                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${cardBg}`}>

                  <div className="relative w-full sm:w-80">

                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input

                      type="text"

                      value={categorySearchQuery}

                      onChange={(e) => setCategorySearchQuery(e.target.value)}

                      placeholder="Search categories (English, Swahili)..."

                      className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-xs border ${inputBg}`}

                    />

                    {categorySearchQuery && (

                      <button

                        onClick={() => setCategorySearchQuery('')}

                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"

                      >

                        <X className="w-3.5 h-3.5" />

                      </button>

                    )}

                  </div>



                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">

                    {/* Grid vs Table View Mode Switcher */}

                    <div className={`flex items-center p-1 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>

                      <button

                        onClick={() => setCategoryViewMode('grid')}

                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${

                          categoryViewMode === 'grid'

                            ? isDark ? 'bg-slate-800 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm'

                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'

                        }`}

                      >

                        <Grid className="w-3.5 h-3.5" />

                        <span>Grid</span>

                      </button>

                      <button

                        onClick={() => setCategoryViewMode('table')}

                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${

                          categoryViewMode === 'table'

                            ? isDark ? 'bg-slate-800 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm'

                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'

                        }`}

                      >

                        <List className="w-3.5 h-3.5" />

                        <span>List</span>

                      </button>

                    </div>



                    <div className={`px-3 py-2 rounded-xl border text-xs font-extrabold flex items-center gap-2 ${

                      isDark ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'

                    }`}>

                      <Tags className="w-4 h-4 text-blue-500" />

                      <span>{categories ? categories.length : 0} Categories</span>

                    </div>

                  </div>

                </div>



                {/* Grid View Mode */}

                {categoryViewMode === 'grid' && (

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

                    {(() => {



                      const sortedCats = [...(categories || [])].sort((a,b) => (a.sequence || 0) - (b.sequence || 0));

                      const filtered = sortedCats.filter((cat) => {



                        if (!categorySearchQuery.trim()) return true;
                        const q = String(categorySearchQuery || '').toLowerCase();
                        return (
                          String(cat?.name || '').toLowerCase().includes(q) ||
                          String(cat?.swahiliName || '').toLowerCase().includes(q) ||
                          String(cat?.description || '').toLowerCase().includes(q)
                        );
                      });



                      if (filtered.length === 0) {

                        return (

                          <div className={`col-span-full p-12 rounded-3xl border text-center ${cardBg}`}>

                            <Tags className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />

                            <h3 className={`text-base font-bold ${textTitle}`}>No categories found</h3>

                            <p className={`text-xs mt-1 ${textSub}`}>Try searching for something else or click "Add Category" above to create one.</p>

                          </div>

                        );

                      }



                      return filtered.map((cat) => {

                        const productCount = products.filter((p) => p.category === cat.name).length;

                        return (

                          <div

                            key={cat.id}

                            onClick={() => setPreviewingCategory(cat)}

                            className={`rounded-3xl border overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:border-blue-500/60 cursor-pointer group hover:-translate-y-1 ${cardBg}`}

                          >

                            {/* Image Header with Transparency Checkerboard */}

                            <div className="relative h-44 w-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] border-b flex items-center justify-center p-4 overflow-hidden dark:border-slate-800">

                              {cat.image ? (

                                <img

                                  src={cat.image}

                                  alt={cat.name}

                                  className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"

                                />

                              ) : (

                                <div className="flex flex-col items-center justify-center text-slate-400">

                                  <Tags className="w-12 h-12 mb-1 opacity-50" />

                                  <span className="text-[10px] font-semibold">No Image</span>

                                </div>

                              )}



                              {/* Badges Overlay */}

                              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">

                                <span className="bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-white/20 shadow-sm flex items-center gap-1">

                                  <span>🇹🇿</span>

                                  <span>{cat.swahiliName || 'General'}</span>

                                </span>

                              </div>



                              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">

                                <span className="bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">

                                  <Package className="w-3 h-3" />

                                  <span>{productCount} {productCount === 1 ? 'Product' : 'Products'}</span>

                                </span>

                              </div>



                              {/* Hover Quick Prompt Overlay */}

                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center p-4 pointer-events-none">

                                <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-blue-600 text-white shadow-lg flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-200">

                                  <Eye className="w-3.5 h-3.5" />

                                  <span>Preview & Quick Edit ({productCount})</span>

                                </span>

                              </div>

                            </div>



                            {/* Card Content */}

                            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">

                              <div>

                                <div className="flex items-center justify-between">

                                  <h3 className={`text-base font-black tracking-tight group-hover:text-blue-500 transition-colors ${textTitle}`}>

                                    {cat.name}

                                  </h3>

                                  <span className="text-[10px] font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">

                                    <span>Manage</span>

                                    <ChevronRight className="w-3 h-3" />

                                  </span>

                                </div>



                                <p className={`text-xs mt-1.5 line-clamp-2 leading-relaxed ${textSub}`}>

                                  {cat.description || 'Official Genuine Electronics category item.'}

                                </p>

                              </div>



                              {/* Card Action Footer */}

                              <div className="pt-3 border-t flex items-center justify-between gap-2 border-slate-100 dark:border-slate-800">

                                <button

                                  type="button"

                                  onClick={(e) => {

                                    e.stopPropagation();

                                    setPreviewingCategory(cat);

                                  }}

                                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"

                                >

                                  <Eye className="w-3.5 h-3.5" />

                                  <span>View Products</span>

                                </button>



                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>

                                  <button

                                    onClick={(e) => {

                                      e.stopPropagation();

                                      setEditingCategory(cat);

                                      setCategoryForm(cat);

                                      setCategoryImageInputMode('upload');

                                      setIsCategoryModalOpen(true);

                                    }}

                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${

                                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'

                                    }`}

                                    title="Edit Category Details"

                                  >

                                    <Edit className="w-3.5 h-3.5 text-blue-500" />

                                    <span>Edit</span>

                                  </button>



                                  <button

                                    onClick={(e) => {

                                      e.stopPropagation();

                                      showConfirm(

                                        'Delete Category',

                                        `Are you sure you want to delete category "${cat.name}"? This action cannot be undone.`,

                                        async () => {

                                          await deleteStorageImage(cat.image);

                                          deleteCategory?.(cat.id);

                                        },

                                        'warning'

                                      );

                                    }}

                                    className={`p-1.5 rounded-xl transition-all ${

                                      isDark ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-400' : 'bg-rose-50 hover:bg-rose-100 text-rose-600'

                                    }`}

                                    title="Delete Category"

                                  >

                                    <Trash2 className="w-3.5 h-3.5" />

                                  </button>

                                </div>

                              </div>

                            </div>

                          </div>

                        );

                      });

                    })()}

                  </div>

                )}



                {/* Table View Mode */}

                {categoryViewMode === 'table' && (

                  <div className={`rounded-3xl border overflow-hidden ${cardBg}`}>

                    <div className="overflow-x-auto w-full">

                      <table className="w-full text-left text-xs min-w-[700px]">

                        <thead>

                          <tr className={`border-b text-xs font-bold uppercase tracking-wider ${tableHeaderBg}`}>

                            <th className="p-4">Category Visual</th>

                            <th className="p-4">English Name</th>

                            <th className="p-4">Swahili Name</th>

                            <th className="p-4">Products Linked</th>

                            <th className="p-4">Description</th>

                            <th className="p-4 text-right">Actions</th>

                          </tr>

                        </thead>

                        <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>

                          {(() => {

      

                      const sortedCats = [...(categories || [])].sort((a,b) => (a.sequence || 0) - (b.sequence || 0));

                      const filtered = sortedCats.filter((cat) => {



                              if (!categorySearchQuery.trim()) return true;
                              const q = String(categorySearchQuery || '').toLowerCase();
                              return (
                                String(cat?.name || '').toLowerCase().includes(q) ||
                                String(cat?.swahiliName || '').toLowerCase().includes(q) ||
                                String(cat?.description || '').toLowerCase().includes(q)
                              );
                            });



                            if (filtered.length === 0) {

                              return (

                                <tr>

                                  <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">

                                    No matching categories found.

                                  </td>

                                </tr>

                              );

                            }



                            return filtered.map((cat) => {

                              const productCount = products.filter((p) => p.category === cat.name).length;

                              return (

                                <tr
                                  key={cat.id}
                                  onClick={() => setPreviewingCategory(cat)}
                                  className={`transition-colors cursor-pointer ${tableRowHover}`}
                                >

                                  <td className="p-4">

                                    <div className="w-12 h-12 rounded-2xl border p-1 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:8px_8px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] dark:border-slate-700 flex items-center justify-center shrink-0">

                                      {cat.image ? (

                                        <img src={cat.image} alt={cat.name} className="w-full h-full object-contain" />

                                      ) : (

                                        <Tags className="w-5 h-5 text-slate-400" />

                                      )}

                                    </div>

                                  </td>

                                  <td className={`p-4 font-black ${textTitle}`}>
                                    <div className="flex items-center gap-2">
                                      <span>{cat.name}</span>
                                      <span className="text-[10px] text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                        (Click to view)
                                      </span>
                                    </div>
                                  </td>

                                  <td className="p-4">

                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">

                                      <span>🇹🇿</span>

                                      <span>{cat.swahiliName || '-'}</span>

                                    </span>

                                  </td>

                                  <td className="p-4 font-bold text-blue-600 dark:text-blue-400">

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewingCategory(cat);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5"
                                      title="Preview all products in this category"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>{productCount} items</span>
                                    </button>

                                  </td>

                                  <td className={`p-4 ${textSub} max-w-[220px] truncate`}>{cat.description || '-'}</td>

                                  <td className="p-4 text-right space-x-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPreviewingCategory(cat);
                                      }}
                                      className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-blue-950/60 text-blue-400 hover:bg-blue-900' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                      title="Preview & Quick Edit Products"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>

                                    <button

                                      onClick={(e) => {
                                        e.stopPropagation();

                                        setEditingCategory(cat);

                                        setCategoryForm(cat);

                                        setCategoryImageInputMode('upload');

                                        setIsCategoryModalOpen(true);

                                      }}

                                      className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}

                                      title="Edit Category"

                                    >

                                      <Edit className="w-4 h-4" />

                                    </button>

                                    <button

                                      onClick={(e) => {
                                        e.stopPropagation();

                                        showConfirm(

                                          'Delete Category',

                                          `Are you sure you want to delete category "${cat.name}"? This action cannot be undone.`,

                                          async () => {

                                            await deleteStorageImage(cat.image);

                                            deleteCategory?.(cat.id);

                                          },

                                          'warning'

                                        );

                                      }}

                                      className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-rose-950/60 hover:bg-rose-900/80 text-rose-400' : 'bg-rose-50 hover:bg-rose-100 text-rose-600'}`}

                                      title="Delete Category"

                                    >

                                      <Trash2 className="w-4 h-4" />

                                    </button>

                                  </td>

                                </tr>

                              );

                            });

                          })()}

                        </tbody>

                      </table>

                    </div>

                  </div>

                )}

              </div>

            )}

          </div>

        )}

        {/* POS REGISTER (Direct Single Screen, No Internal Submenus) */}
        {activeTab === 'pos' && (
          <div className="space-y-4">
            {/* Tight Top Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/80 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className={`text-xl font-black tracking-tight ${textTitle}`}>POS Register</h1>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Live Counter
                    </span>
                  </div>
                  <p className={`text-xs ${textSub}`}>Instant barcode scanning, dynamic payments, and fast thermal receipts.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Wholesale / Retail Price Tier Selector */}
                <div className="flex items-center rounded-xl border p-0.5 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPosPriceTier('retail');
                      triggerHaptic('light');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                      posPriceTier === 'retail'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Retail
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPosPriceTier('wholesale');
                      triggerHaptic('light');
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all ${
                      posPriceTier === 'wholesale'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : isDark ? 'text-purple-400 hover:text-purple-300' : 'text-purple-700 hover:text-purple-900'
                    }`}
                    title="Apply wholesale trade pricing"
                  >
                    <span>Wholesale</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded font-black ${posPriceTier === 'wholesale' ? 'bg-white/20' : 'bg-purple-500/20'}`}>
                      -{posWholesaleDiscountPct}%
                    </span>
                  </button>
                </div>

                {/* Z-Report / Daily Register Closure */}
                <button
                  type="button"
                  onClick={() => setIsZReportOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                  title="Daily Register Z-Report & Cash Drawer Balancing (EAT GMT+3)"
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>Z-Report</span>
                </button>

                {/* TRA Tax Journal Export */}
                <button
                  type="button"
                  onClick={() => {
                    exportTaxJournalToCSV(posTransactions, posVatPct);
                    triggerHaptic('success');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                  title="Export Tax Journal (CSV)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">TRA Tax Journal</span>
                </button>

                {posParkedOrders.length > 0 && (
                  <button
                    onClick={() => setShowParkedModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20 flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Parked ({posParkedOrders.length})</span>
                  </button>
                )}

                <div className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2.5 ${cardBg}`}>
                  <span className={textSub}>Today:</span>
                  <span className="font-extrabold text-blue-500">
                    {formatTZS(
                      (posTransactions || [])
                        .filter(t => {
                          const todayStr = new Date().toISOString().split('T')[0];
                          return t.createdAt && t.createdAt.startsWith(todayStr);
                        })
                        .reduce((sum, t) => sum + Number(t.total || 0), 0)
                    )}
                  </span>
                  <span className={`text-[10px] font-semibold ${textSub}`}>
                    ({(posTransactions || []).filter(t => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      return t.createdAt && t.createdAt.startsWith(todayStr);
                    }).length})
                  </span>
                </div>
              </div>
            </div>

            {scanMessage && (
              <div className="bg-emerald-900/60 border border-emerald-700/80 text-emerald-200 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{scanMessage}</span>
                </div>
                <button onClick={() => setScanMessage(null)} className="text-emerald-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* POS Main Grid: Left Catalog + Right Full-Height Selling Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pb-20 lg:pb-0 min-h-[calc(100vh-220px)]">
              {/* Product Selector / Scanner / Catalog (Cols 7 on lg, 8 on 2xl) */}
              <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 flex flex-col space-y-4">
                {/* Search, Filter Bar & Controls */}
                <div className={`p-4 rounded-2xl border space-y-3 ${cardBg}`}>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <QrCode className="w-4 h-4 text-blue-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Scan barcode, enter SKU, or type product name..."
                        value={posBarcodeQuery}
                        onChange={(e) => setPosBarcodeQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && posBarcodeQuery.trim()) {
                            handleScanQrCode(posBarcodeQuery);
                            setPosBarcodeQuery('');
                          }
                        }}
                        className={`w-full rounded-xl pl-10 pr-9 py-2.5 text-sm ${inputBg}`}
                      />
                      {posBarcodeQuery && (
                        <button
                          onClick={() => setPosBarcodeQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => setIsScannerOpen(true)}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 shrink-0 transition-all active:scale-95"
                    >
                      <Scan className="w-4 h-4" />
                      <span className="hidden sm:inline">Camera Scanner</span>
                    </button>

                    {/* View Switcher: Grid vs Compact */}
                    <div className="flex items-center rounded-xl border p-0.5 shrink-0 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => setPosViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${posViewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        title="Visual Grid View"
                      >
                        <Grid className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPosViewMode('compact')}
                        className={`p-2 rounded-lg transition-all ${posViewMode === 'compact' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        title="Fast Compact List View"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills & In-Stock Filter */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide no-scrollbar flex-1">
                      <button
                        onClick={() => setSelectedPOSCategory('All')}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                          selectedPOSCategory === 'All'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : isDark ? 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        All ({products.length})
                      </button>
                      {categories.map(cat => {
                        const count = products.filter(p => p.category === cat.name).length;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedPOSCategory(cat.name)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                              selectedPOSCategory === cat.name
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : isDark ? 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {cat.name} ({count})
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setPosFilterInStockOnly(!posFilterInStockOnly)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5 ${
                        posFilterInStockOnly
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : isDark ? 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Check className={`w-3 h-3 ${posFilterInStockOnly ? 'opacity-100' : 'opacity-40'}`} />
                      <span>In-Stock Only</span>
                    </button>
                  </div>
                </div>

                {/* Product Catalog Display (Grid / Compact) */}
                {(() => {
                  const filteredProducts = products.filter((p) => {
                    const matchesCategory = selectedPOSCategory === 'All' || p.category === selectedPOSCategory;
                    const q = (posBarcodeQuery || '').toLowerCase().trim();
                    const matchesQuery =
                      !q ||
                      (p.name && String(p.name).toLowerCase().includes(q)) ||
                      (p.barcode && p.barcode.includes(posBarcodeQuery)) ||
                      (p.sku && String(p.sku).toLowerCase().includes(q)) ||
                      (p.brand && String(p.brand).toLowerCase().includes(q));
                    const matchesStock = !posFilterInStockOnly || Number(p.stock || 0) > 0;
                    return matchesCategory && matchesQuery && matchesStock;
                  });

                  if (filteredProducts.length === 0) {
                    return (
                      <div className={`flex-1 rounded-2xl border p-12 text-center flex flex-col items-center justify-center ${cardBg}`}>
                        <Package className="w-12 h-12 text-slate-400 mb-3 stroke-[1.5]" />
                        <h4 className={`text-base font-bold ${textTitle}`}>No products found</h4>
                        <p className={`text-xs mt-1 max-w-sm ${textSub}`}>
                          Try clearing the search query or adjusting category filters.
                        </p>
                        {posBarcodeQuery && (
                          <button
                            onClick={() => setPosBarcodeQuery('')}
                            className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-sm"
                          >
                            Clear Search
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (posViewMode === 'compact') {
                    return (
                      <div className={`flex-1 rounded-2xl border overflow-hidden ${cardBg}`}>
                        <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className={`sticky top-0 z-10 uppercase text-[10px] font-black tracking-wider ${isDark ? 'bg-slate-800/90 text-slate-400 border-b border-slate-700' : 'bg-slate-100 text-slate-600 border-b border-slate-200'}`}>
                              <tr>
                                <th className="p-3">Product</th>
                                <th className="p-3">SKU / Barcode</th>
                                <th className="p-3">Category</th>
                                <th className="p-3 text-center">Stock</th>
                                <th className="p-3 text-right">Price</th>
                                <th className="p-3 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {filteredProducts.map((p) => {
                                const stock = Number(p.stock || 0);
                                const inCart = posCart.find(i => i.product.id === p.id);
                                return (
                                  <tr
                                    key={p.id}
                                    onClick={() => handleAddToCartPOS(p)}
                                    className={`transition-colors cursor-pointer ${
                                      isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                                    } ${inCart ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                                  >
                                    <td className="p-3">
                                      <div className="flex items-center gap-3">
                                        <img src={p.image} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                                        <div className="min-w-0">
                                          <div className={`font-bold truncate ${textTitle}`}>{p.name}</div>
                                          <div className="text-[10px] text-emerald-500 font-semibold">{p.brand}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-3 font-mono text-[11px] text-slate-400">{p.sku || p.barcode}</td>
                                    <td className="p-3 text-slate-400">{p.category}</td>
                                    <td className="p-3 text-center">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                        stock <= 0
                                          ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                          : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                      }`}>
                                        {stock <= 0 ? 'Empty (0)' : `${stock} left`}
                                      </span>
                                    </td>
                                    <td className="p-3 text-right font-extrabold text-blue-500">{formatTZS(p.price)}</td>
                                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={() => handleAddToCartPOS(p)}
                                        disabled={stock <= 0}
                                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[11px] shadow-sm transition-all active:scale-95 inline-flex items-center gap-1"
                                        title={stock <= 0 ? 'Cannot sell empty stock' : 'Add to register'}
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>{stock <= 0 ? 'Empty' : 'Add'}</span>
                                        {inCart && <span className="bg-white/20 px-1 rounded text-[9px] ml-0.5">{inCart.quantity}</span>}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
                      {filteredProducts.map((p) => {
                        const stock = Number(p.stock || 0);
                        const inCart = posCart.find(i => i.product.id === p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleAddToCartPOS(p)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                              isDark
                                ? 'bg-slate-900 border-slate-800 hover:border-blue-500 hover:bg-slate-850'
                                : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-md'
                            } ${inCart ? 'ring-2 ring-blue-500/50 border-blue-500' : ''}`}
                          >
                            <div className="flex gap-3 items-start">
                              <div className="relative shrink-0">
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className={`w-16 h-16 object-cover rounded-xl border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
                                />
                                {inCart && (
                                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shadow-md">
                                    {inCart.quantity}
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="text-[10px] text-emerald-500 font-bold uppercase truncate">{p.brand || p.category}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                                    stock <= 0
                                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                      : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                  }`}>
                                    {stock <= 0 ? 'Empty (0)' : `${stock} left`}
                                  </span>
                                </div>
                                <h4 className={`font-bold text-xs line-clamp-2 leading-snug ${textTitle}`}>{p.name}</h4>
                                <div className="text-[10px] font-mono text-slate-400 mt-1 truncate">SKU: {p.sku || p.barcode}</div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                              <div className="text-xs font-black text-blue-500 whitespace-nowrap">{formatTZS(p.price)}</div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToCartPOS(p);
                                }}
                                disabled={stock <= 0}
                                className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-600 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed font-bold text-[10px] transition-all flex items-center gap-1"
                                title={stock <= 0 ? 'Cannot sell empty stock' : 'Add to register'}
                              >
                                <Plus className="w-3 h-3" />
                                <span>{stock <= 0 ? 'Empty' : 'Add'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* POS Cart & Stretched Checkout Section (Cols 5 on lg, 4 on 2xl) */}
              <div
                id="pos-cart-section"
                className={`lg:col-span-5 xl:col-span-5 2xl:col-span-4 rounded-3xl border p-5 sm:p-6 flex flex-col justify-between sticky top-4 lg:min-h-[calc(100vh-140px)] lg:max-h-[calc(100vh-100px)] overflow-y-auto ${cardBg} shadow-xl`}
              >
                <div className="space-y-4">
                  {/* Cart Header */}
                  <div className={`pb-3 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div>
                      <h3 className={`text-base font-extrabold flex items-center gap-2 ${textTitle}`}>
                        <ShoppingCart className="w-4 h-4 text-blue-500" />
                        <span>Active Selling Register</span>
                      </h3>
                      <p className={`text-[11px] ${textSub}`}>Cashier: {profile?.fullName || user?.email?.split('@')[0] || 'Admin'}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-xl font-black shadow-sm">
                        {posCart.reduce((a, c) => a + c.quantity, 0)} items
                      </span>

                      {posCart.length > 0 && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={handleParkCurrentCart}
                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10 border border-amber-500/20 transition-all"
                            title="Hold / Park Current Sale"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              showConfirm(
                                'Clear Cart',
                                'Are you sure you want to clear all items from the cart?',
                                () => {
                                  handleClearCartPOS();
                                },
                                'warning'
                              );
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all"
                            title="Clear Cart"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Info Selection / Input & Intelligence Lookup */}
                  {(() => {
                    // Safe string normalization helpers to prevent any runtime errors on autofill/browser population
                    const rawPhone = typeof posCustomerPhone === 'string' ? posCustomerPhone : String(posCustomerPhone ?? '');
                    const rawName = typeof posCustomerName === 'string' ? posCustomerName : String(posCustomerName ?? '');
                    const rawEmail = typeof posCustomerEmail === 'string' ? posCustomerEmail : String(posCustomerEmail ?? '');
                    const rawTin = typeof posCustomerTin === 'string' ? posCustomerTin : String(posCustomerTin ?? '');

                    const cleanPhone = rawPhone.trim().replace(/[^0-9+]/g, '');
                    const cleanName = String(rawName || '').trim().toLowerCase();
                    const cleanEmail = String(rawEmail || '').trim().toLowerCase();

                    // Digits-only normalizer for tolerant phone matching (e.g. +255 712 345 vs 0712345)
                    const getDigits = (val: unknown): string => {
                      if (!val) return '';
                      return String(val).replace(/[^0-9]/g, '');
                    };

                    const isPhoneMatch = (p1: unknown, p2: unknown): boolean => {
                      const d1 = getDigits(p1);
                      const d2 = getDigits(p2);
                      if (!d1 || !d2 || d1.length < 6 || d2.length < 6) return false;
                      if (d1 === d2) return true;
                      const suf1 = d1.slice(-8);
                      const suf2 = d2.slice(-8);
                      return suf1.length === 8 && suf1 === suf2;
                    };

                    const isNameMatch = (n1: unknown, n2: unknown): boolean => {
                      if (!n1 || !n2) return false;
                      const s1 = String(n1).trim().toLowerCase();
                      const s2 = String(n2).trim().toLowerCase();
                      if (!s1 || !s2 || s1 === 'walk-in customer' || s1 === 'walk-in') return false;
                      return s1 === s2 || (s1.length >= 3 && s2.length >= 3 && (s1.includes(s2) || s2.includes(s1)));
                    };

                    // Extract unique customer suggestions for native browser datalists
                    const phoneSuggestions: { phone: string; name: string; email?: string }[] = [];
                    const nameSuggestions: { name: string; phone?: string; email?: string }[] = [];
                    const emailSuggestions: { email: string; name?: string; phone?: string }[] = [];
                    const seenPhones = new Set<string>();
                    const seenNames = new Set<string>();
                    const seenEmails = new Set<string>();

                    (profiles || []).forEach(p => {
                      if (!p) return;
                      const pName = typeof p.fullName === 'string' ? p.fullName.trim() : (typeof p.email === 'string' ? p.email.split('@')[0] : '');
                      const pPhone = typeof p.phone === 'string' ? p.phone.trim() : '';
                      const pEmail = typeof p.email === 'string' ? p.email.trim() : '';
                      if (pName && !seenNames.has(String(pName || "").toLowerCase()) && String(pName || "").toLowerCase() !== 'walk-in customer') {
                        seenNames.add(String(pName || "").toLowerCase());
                        nameSuggestions.push({ name: pName, phone: pPhone, email: pEmail });
                      }
                      if (pPhone && !seenPhones.has(pPhone)) {
                        seenPhones.add(pPhone);
                        phoneSuggestions.push({ phone: pPhone, name: pName, email: pEmail });
                      }
                      if (pEmail && !seenEmails.has(String(pEmail || "").toLowerCase()) && pEmail.includes('@')) {
                        seenEmails.add(String(pEmail || "").toLowerCase());
                        emailSuggestions.push({ email: pEmail, name: pName, phone: pPhone });
                      }
                    });

                    (orders || []).forEach(o => {
                      if (!o) return;
                      const oName = typeof o.customerName === 'string' ? o.customerName.trim() : '';
                      const oPhone = typeof o.customerPhone === 'string' ? o.customerPhone.trim() : '';
                      const oEmail = typeof o.customerEmail === 'string' ? o.customerEmail.trim() : '';
                      if (oName && !seenNames.has(String(oName || "").toLowerCase()) && String(oName || "").toLowerCase() !== 'walk-in customer') {
                        seenNames.add(String(oName || "").toLowerCase());
                        nameSuggestions.push({ name: oName, phone: oPhone, email: oEmail });
                      }
                      if (oPhone && !seenPhones.has(oPhone)) {
                        seenPhones.add(oPhone);
                        phoneSuggestions.push({ phone: oPhone, name: oName, email: oEmail });
                      }
                      if (oEmail && !seenEmails.has(String(oEmail || "").toLowerCase()) && oEmail.includes('@')) {
                        seenEmails.add(String(oEmail || "").toLowerCase());
                        emailSuggestions.push({ email: oEmail, name: oName, phone: oPhone });
                      }
                    });

                    (posTransactions || []).forEach(t => {
                      if (!t) return;
                      const tName = typeof t.customerName === 'string' ? t.customerName.trim() : '';
                      const tPhone = typeof t.customerPhone === 'string' ? t.customerPhone.trim() : '';
                      const tEmail = typeof (t as any).customerEmail === 'string' ? (t as any).customerEmail.trim() : '';
                      if (tName && !seenNames.has(String(tName || "").toLowerCase()) && String(tName || "").toLowerCase() !== 'walk-in customer') {
                        seenNames.add(String(tName || "").toLowerCase());
                        nameSuggestions.push({ name: tName, phone: tPhone, email: tEmail });
                      }
                      if (tPhone && !seenPhones.has(tPhone)) {
                        seenPhones.add(tPhone);
                        phoneSuggestions.push({ phone: tPhone, name: tName, email: tEmail });
                      }
                      if (tEmail && !seenEmails.has(String(tEmail || "").toLowerCase()) && tEmail.includes('@')) {
                        seenEmails.add(String(tEmail || "").toLowerCase());
                        emailSuggestions.push({ email: tEmail, name: tName, phone: tPhone });
                      }
                    });

                    // Match customer profile from profiles or past transactions
                    const matchedProfile = (profiles || []).find(p => p && (
                      (cleanPhone && isPhoneMatch(p.phone, cleanPhone)) ||
                      (cleanEmail && p.email && String(p.email).toLowerCase() === cleanEmail) ||
                      (cleanName && cleanName.length >= 3 && isNameMatch(p.fullName, cleanName))
                    ));

                    // Compute customer intelligence from orders and POS transactions
                    const custOrders = (orders || []).filter(o => o && (
                      (cleanPhone && isPhoneMatch(o.customerPhone, cleanPhone)) ||
                      (cleanEmail && o.customerEmail && String(o.customerEmail).toLowerCase() === cleanEmail) ||
                      (cleanName && cleanName.length >= 3 && isNameMatch(o.customerName, cleanName))
                    ));

                    const custPosTx = (posTransactions || []).filter(t => t && (
                      (cleanPhone && isPhoneMatch(t.customerPhone, cleanPhone)) ||
                      (cleanEmail && (t as any).customerEmail && String((t as any).customerEmail).toLowerCase() === cleanEmail) ||
                      (cleanName && cleanName.length >= 3 && isNameMatch(t.customerName, cleanName))
                    ));

                    const totalSpend = [
                      ...custOrders.filter(o => o && o.status !== 'Cancelled').map(o => Number(o.totalAmount || 0)),
                      ...custPosTx.map(t => Number(t.total || 0))
                    ].reduce((sum, v) => sum + v, 0);

                    const totalOrdersCount = custOrders.length + custPosTx.length;

                    const customerLoans = custPosTx.filter(t => {
                      if (!t) return false;
                      const pm = String(t.paymentMethod || '').toLowerCase();
                      const isLoan = Boolean(t.isLoan) || pm.includes('loan') || pm.includes('credit') || pm.includes('mkopo') || pm.includes('debt') || pm.includes('deni');
                      return isLoan && (Number(t.loanBalance) || 0) > 0;
                    });
                    const outstandingDebt = customerLoans.reduce((sum, t) => sum + (Number(t.loanBalance) || 0), 0);
                    const overdueLoans = customerLoans.filter(t => t && t.loanDueDate && !isNaN(new Date(t.loanDueDate).getTime()) && new Date(t.loanDueDate) < new Date());

                    let tier = 'Standard';
                    let tierColor = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
                    let suggestedDiscountPct = 0;
                    if (totalSpend >= 5000000) {
                      tier = 'Platinum VIP';
                      tierColor = 'bg-purple-500/10 text-purple-400 border-purple-500/30';
                      suggestedDiscountPct = 10;
                    } else if (totalSpend >= 2000000) {
                      tier = 'Gold VIP';
                      tierColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                      suggestedDiscountPct = 5;
                    } else if (totalSpend >= 500000) {
                      tier = 'Silver Member';
                      tierColor = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                      suggestedDiscountPct = 3;
                    }

                    const isWalkIn = cleanName === 'walk-in customer' || cleanName === 'walk-in';
                    const isIdentified = (cleanPhone.length >= 4 || cleanEmail.length >= 5 || (cleanName.length >= 3 && !isWalkIn));

                    // Suggested complementary info for 1-click auto-population
                    const suggestedNameFromPhone = (!rawName || isWalkIn) && cleanPhone ? (
                      matchedProfile?.fullName ||
                      phoneSuggestions.find(s => isPhoneMatch(s.phone, cleanPhone))?.name ||
                      custOrders.find(o => o.customerName && isPhoneMatch(o.customerPhone, cleanPhone))?.customerName ||
                      custPosTx.find(t => t.customerName && isPhoneMatch(t.customerPhone, cleanPhone))?.customerName ||
                      ''
                    ) : '';

                    return (
                      <div className="p-3 rounded-2xl border space-y-2.5 bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80">
                        {/* Native HTML5 Datalists for fast keyboard auto-fill & suggestion bars */}
                        <datalist id="pos-customer-names-list">
                          {nameSuggestions.slice(0, 30).map((s, i) => (
                            <option key={`c-name-${i}`} value={s.name}>
                              {s.phone ? `${s.name} (${s.phone})` : s.name}
                            </option>
                          ))}
                        </datalist>

                        <datalist id="pos-customer-phones-list">
                          {phoneSuggestions.slice(0, 30).map((s, i) => (
                            <option key={`c-phone-${i}`} value={s.phone}>
                              {s.name ? `${s.name} (${s.phone})` : s.phone}
                            </option>
                          ))}
                        </datalist>

                        <datalist id="pos-customer-emails-list">
                          {emailSuggestions.slice(0, 30).map((s, i) => (
                            <option key={`c-email-${i}`} value={s.email}>
                              {s.name ? `${s.name} (${s.email})` : s.email}
                            </option>
                          ))}
                        </datalist>

                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-blue-500" />
                            <span className={textTitle}>Customer Info & Intelligence</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {profiles.length > 0 && (
                              <select
                                onChange={(e) => {
                                  const prof = profiles.find(p => p && p.id === e.target.value);
                                  if (prof) {
                                    setPosCustomerName(prof.fullName || prof.email?.split('@')[0] || '');
                                    setPosCustomerPhone(prof.phone || '');
                                    setPosCustomerEmail(prof.email || '');
                                    triggerHaptic('light');
                                  }
                                }}
                                defaultValue=""
                                className={`text-[10px] py-0.5 px-2 rounded-lg border font-semibold ${inputBg}`}
                              >
                                <option value="" disabled>Registered Customers ({profiles.length})</option>
                                {profiles.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.fullName || p.email} {p.phone ? `(${p.phone})` : ''}
                                  </option>
                                ))}
                              </select>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setPosCustomerName('Walk-in Customer');
                                setPosCustomerPhone('');
                                setPosCustomerEmail('');
                                setPosCustomerTin('');
                              }}
                              className="text-[10px] text-blue-500 hover:underline font-semibold"
                            >
                              Reset Walk-in
                            </button>
                          </div>
                        </div>

                        {/* Responsive native inputs with standard autoComplete tokens for mobile auto-fill keyboards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                          <div>
                            <label htmlFor="pos-customer-name-input" className="sr-only">Customer Full Name</label>
                            <input
                              id="pos-customer-name-input"
                              type="text"
                              name="name"
                              autoComplete="name"
                              inputMode="text"
                              autoCapitalize="words"
                              autoCorrect="off"
                              spellCheck={false}
                              list="pos-customer-names-list"
                              placeholder="Name (e.g. John Doe)"
                              value={rawName}
                              onChange={(e) => {
                                const val = String(e.target?.value ?? '');
                                setPosCustomerName(val);
                                // Cross-fill phone/email if a known full name is selected from list
                                const found = nameSuggestions.find(s => (s?.name || '').toLowerCase() === String(val || '').trim().toLowerCase());
                                if (found) {
                                  if (!posCustomerPhone && found.phone) setPosCustomerPhone(found.phone);
                                  if (!posCustomerEmail && found.email) setPosCustomerEmail(found.email);
                                }
                              }}
                              onInput={(e: any) => setPosCustomerName(String(e.target?.value ?? ''))}
                              className={`w-full rounded-xl px-3 py-1.5 text-xs ${inputBg}`}
                            />
                            {suggestedNameFromPhone && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPosCustomerName(suggestedNameFromPhone);
                                  triggerHaptic('light');
                                }}
                                className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                              >
                                <Sparkles className="w-2.5 h-2.5" /> Auto-fill: {suggestedNameFromPhone}
                              </button>
                            )}
                          </div>

                          <div>
                            <label htmlFor="pos-customer-phone-input" className="sr-only">Customer Phone Number</label>
                            <input
                              id="pos-customer-phone-input"
                              type="tel"
                              name="tel"
                              autoComplete="tel"
                              inputMode="tel"
                              autoCapitalize="none"
                              autoCorrect="off"
                              list="pos-customer-phones-list"
                              placeholder="Phone (e.g. +255 7...)"
                              value={rawPhone}
                              onBlur={() => setPosCustomerPhone(formatTzPhone(rawPhone))}
                              onChange={(e) => {
                                const val = String(e.target?.value ?? '');
                                setPosCustomerPhone(val);
                                // If autofill populated a known phone and name is empty/walk-in, auto-fill name & email
                                if ((!posCustomerName || posCustomerName === 'Walk-in Customer') && val.trim().length >= 7) {
                                  const foundProfile = (profiles || []).find(p => p && isPhoneMatch(p.phone, val));
                                  const foundSuggestion = phoneSuggestions.find(s => isPhoneMatch(s.phone, val));
                                  const foundName = foundProfile?.fullName || foundSuggestion?.name;
                                  const foundEmail = foundProfile?.email || foundSuggestion?.email;
                                  if (foundName) setPosCustomerName(foundName);
                                  if (foundEmail && !posCustomerEmail) setPosCustomerEmail(foundEmail);
                                }
                              }}
                              onInput={(e: any) => setPosCustomerPhone(String(e.target?.value ?? ''))}
                              className={`w-full rounded-xl px-3 py-1.5 text-xs ${inputBg}`}
                            />
                          </div>

                          <div>
                            <label htmlFor="pos-customer-email-input" className="sr-only">Customer Email Address</label>
                            <input
                              id="pos-customer-email-input"
                              type="email"
                              name="email"
                              autoComplete="email"
                              inputMode="email"
                              autoCapitalize="none"
                              autoCorrect="off"
                              spellCheck={false}
                              list="pos-customer-emails-list"
                              placeholder="Email (Optional)"
                              value={rawEmail}
                              onChange={(e) => {
                                const val = String(e.target?.value ?? '');
                                setPosCustomerEmail(val);
                                if ((!posCustomerName || posCustomerName === 'Walk-in Customer') && val.includes('@')) {
                                  const found = emailSuggestions.find(s => (s?.email || '').toLowerCase() === String(val || '').trim().toLowerCase());
                                  if (found?.name) setPosCustomerName(found.name);
                                  if (found?.phone && !posCustomerPhone) setPosCustomerPhone(found.phone);
                                }
                              }}
                              onInput={(e: any) => setPosCustomerEmail(String(e.target?.value ?? ''))}
                              className={`w-full rounded-xl px-3 py-1.5 text-xs ${inputBg}`}
                            />
                          </div>

                          <div>
                            <label htmlFor="pos-customer-tin-input" className="sr-only">Customer Tax ID TIN</label>
                            <input
                              id="pos-customer-tin-input"
                              type="text"
                              name="tax-id"
                              autoComplete="off"
                              inputMode="text"
                              autoCapitalize="none"
                              spellCheck={false}
                              placeholder="TIN (Optional B2B)"
                              value={rawTin}
                              onChange={(e) => setPosCustomerTin(String(e.target?.value ?? ''))}
                              onInput={(e: any) => setPosCustomerTin(String(e.target?.value ?? ''))}
                              className={`w-full rounded-xl px-3 py-1.5 text-xs ${inputBg}`}
                            />
                          </div>
                        </div>

                        {/* Customer Intelligence Card */}
                        {isIdentified && (
                          <div className={`p-2.5 rounded-xl border text-xs space-y-2 animate-fadeIn ${
                            outstandingDebt > 0 
                              ? isDark ? 'bg-rose-950/20 border-rose-900/50' : 'bg-rose-50/70 border-rose-200'
                              : isDark ? 'bg-slate-900/90 border-slate-700/80' : 'bg-white border-slate-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${tierColor}`}>
                                  {tier}
                                </span>
                                {matchedProfile && (
                                  <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                                    <BadgeCheck className="w-3 h-3" /> Registered Client
                                  </span>
                                )}
                              </div>

                              {suggestedDiscountPct > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const disc = Math.round(posCartGross * (suggestedDiscountPct / 100));
                                    setPosDiscount(disc);
                                    triggerHaptic('success');
                                  }}
                                  className="text-[10px] font-bold text-amber-500 hover:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 flex items-center gap-1"
                                >
                                  <Sparkles className="w-2.5 h-2.5" />
                                  <span>Apply {suggestedDiscountPct}% VIP Discount</span>
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                              <div>
                                <span className={`text-[10px] block ${textSub}`}>Lifetime Spend</span>
                                <span className={`font-extrabold ${textTitle}`}>{formatTZS(totalSpend)}</span>
                              </div>
                              <div>
                                <span className={`text-[10px] block ${textSub}`}>Total Transactions</span>
                                <span className={`font-extrabold ${textTitle}`}>{totalOrdersCount} purchases</span>
                              </div>
                              <div className="col-span-2 sm:col-span-1">
                                <span className={`text-[10px] block ${textSub}`}>Outstanding Debt</span>
                                {outstandingDebt > 0 ? (
                                  <span className="font-extrabold text-rose-500 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3 shrink-0" />
                                    <span>{formatTZS(outstandingDebt)}</span>
                                    {overdueLoans.length > 0 && <span className="text-[9px] bg-rose-600 text-white px-1 rounded">OVERDUE</span>}
                                  </span>
                                ) : (
                                  <span className="font-extrabold text-emerald-500 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> None (Clean)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Scrollable Cart Item List */}
                  <div className="space-y-2.5 max-h-[240px] 2xl:max-h-[300px] overflow-y-auto pr-1">
                    {posCart.length === 0 ? (
                      <div className={`text-center py-10 px-4 rounded-2xl border border-dashed ${isDark ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
                        <ShoppingCart className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                        <p className={`text-xs font-semibold ${textTitle}`}>Cart is empty</p>
                        <p className={`text-[11px] mt-0.5 ${textSub}`}>Click catalog items or scan barcodes to begin sale.</p>
                      </div>
                    ) : (
                      posCart.map((item) => {
                        const stock = Number(item.product.stock || 0);
                        const unitPrice = getPosItemUnitPrice(item);
                        const isWholesale = (item.priceTier || posPriceTier) === 'wholesale';
                        const serialCount = (item.serialNumbers || []).length;
                        return (
                          <div
                            key={item.product.id}
                            className={`p-2.5 rounded-2xl border flex flex-col gap-2 ${
                              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <img
                                src={item.product.image}
                                alt={item.product.name}
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className={`font-bold text-xs truncate ${textTitle}`}>{item.product.name}</h4>
                                  {isWholesale && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                      Wholesale
                                    </span>
                                  )}
                                  {item.product?.isVatInclusive !== false && posVatPct > 0 ? (
                                    <span className="px-1.5 py-0.2 rounded text-[8.5px] font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                      VAT Incl.
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded text-[8.5px] font-extrabold bg-slate-500/20 text-slate-500 dark:text-slate-400 border border-slate-500/30">
                                      Non-VAT
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] font-extrabold text-blue-500">{formatTZS(unitPrice)}</span>
                                  {isWholesale && item.product.price && Number(item.product.price) > unitPrice && (
                                    <span className="text-[10px] text-slate-400 line-through">{formatTZS(item.product.price)}</span>
                                  )}
                                  <span className="text-[10px] text-slate-400">· Max {stock}</span>
                                </div>
                              </div>

                              {/* Quantity Selector */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQuantityPOS(item.product.id, item.quantity - 1)}
                                  className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs font-bold transition-all active:scale-95"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>

                                <input
                                  type="number"
                                  min="1"
                                  max={stock}
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateQuantityPOS(item.product.id, Number(e.target.value) || 1)}
                                  className={`w-9 text-center rounded-lg py-0.5 text-xs font-bold ${inputBg} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                />

                                <button
                                  type="button"
                                  onClick={() => handleAddToCartPOS(item.product)}
                                  className="w-6 h-6 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center text-xs font-bold transition-all active:scale-95"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemPOS(item.product.id)}
                                  className="w-6 h-6 ml-1 rounded-lg text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Item Controls: Serial / IMEI Tracking Button */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px]">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSerialInputItem({
                                    productId: item.product.id,
                                    productName: item.product.name,
                                    quantity: item.quantity,
                                    currentSerials: item.serialNumbers || []
                                  });
                                  triggerHaptic('light');
                                }}
                                className={`px-2 py-0.5 rounded-lg border font-bold flex items-center gap-1 transition-all ${
                                  serialCount >= item.quantity && item.quantity > 0
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                                    : serialCount > 0
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-blue-500'
                                }`}
                                title="Attach device serial numbers or IMEI codes to print on customer receipt"
                              >
                                <Hash className="w-3 h-3" />
                                <span>
                                  {serialCount > 0 ? `S/N: ${serialCount}/${item.quantity} Entered` : '+ Add Serial/IMEI Numbers'}
                                </span>
                              </button>

                              <span className="font-extrabold text-xs text-slate-700 dark:text-slate-200">
                                {formatTZS(unitPrice * item.quantity)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Bottom Financials, Discounts, Payment & Tendered */}
                <div className="space-y-3 pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
                  {/* Quick Discounts & TRA VAT Controls */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* TRA VAT Toggle */}
                    <label className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={posIncludeVat}
                          onChange={(e) => setPosIncludeVat(e.target.checked)}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-[11px] font-bold">TRA VAT ({posVatPct}%)</span>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${posIncludeVat ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'}`}>
                        {posIncludeVat ? 'Active' : 'Off'}
                      </span>
                    </label>

                    {/* Auto-Email Receipt Toggle */}
                    <label className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 cursor-pointer">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={posSendReceiptEmail}
                          onChange={(e) => setPosSendReceiptEmail(e.target.checked)}
                          disabled={!posCustomerEmail}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <span className="text-[11px] font-bold">Email Receipt</span>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${posSendReceiptEmail && posCustomerEmail ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'}`}>
                        {posCustomerEmail ? (posSendReceiptEmail ? 'Yes' : 'No') : 'No Email'}
                      </span>
                    </label>

                    {/* Quick Discount Input */}
                    <div className="flex items-center gap-1 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                      <Percent className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
                      <input
                        type="number"
                        placeholder="Discount TZS"
                        min="0"
                        value={posDiscount || ''}
                        onChange={(e) => setPosDiscount(Number(e.target.value) || 0)}
                        className={`w-full bg-transparent text-xs font-bold outline-none px-1 ${textTitle}`}
                      />
                    </div>
                  </div>

                  {/* Quick % Discount Buttons */}
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className={`font-semibold shrink-0 ${textSub}`}>Quick %:</span>
                    {[0, 5, 10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const disc = Math.round(posCartGross * (pct / 100));
                          setPosDiscount(disc);
                        }}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all border ${
                          posDiscount === Math.round(posCartGross * (pct / 100)) && posCartGross > 0
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-white'
                        }`}
                      >
                        {pct === 0 ? 'None' : `${pct}%`}
                      </button>
                    ))}
                  </div>

                  {/* Extra Costs & Services (Transport, Delivery, Installation, Custom) */}
                  <div className={`p-2.5 rounded-2xl border ${isDark ? 'bg-slate-800/30 border-slate-700/70' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-blue-500" />
                        <span className={`text-[11px] font-bold ${textTitle}`}>Extra Costs & Services</span>
                      </div>
                      {posExtraCosts.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                          +{formatTZS(posExtraCostsTotal)}
                        </span>
                      )}
                    </div>

                    {/* Quick Add Presets */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {[
                        { name: 'Transport (Dar es Salaam)', amount: 10000 },
                        { name: 'Upcountry Cargo / Bus', amount: 25000 },
                        { name: 'Installation & Setup', amount: 20000 },
                        { name: 'Packaging / Crating', amount: 5000 },
                      ].map((preset, pIdx) => {
                        const isAlreadyAdded = posExtraCosts.some(c => (c.name || '').toLowerCase() === (preset.name || '').toLowerCase());
                        return (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => {
                              if (isAlreadyAdded) {
                                setPosExtraCosts(prev => prev.filter(c => (c.name || '').toLowerCase() !== (preset.name || '').toLowerCase()));
                              } else {
                                setPosExtraCosts(prev => [...prev, { name: preset.name, amount: preset.amount }]);
                              }
                              triggerHaptic('light');
                            }}
                            className={`text-[10px] px-2 py-1 rounded-lg font-medium border transition-all flex items-center gap-1 ${
                              isAlreadyAdded
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                            }`}
                          >
                            <span>{isAlreadyAdded ? '✓' : '+'}</span>
                            <span>{preset.name.split(' ')[0]} ({formatTZS(preset.amount)})</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Extra Costs List */}
                    {posExtraCosts.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {posExtraCosts.map((cost, cIdx) => (
                          <div key={cIdx} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={cost.name}
                              placeholder="Cost name (e.g. Transport)"
                              onChange={(e) => {
                                const val = e.target.value;
                                setPosExtraCosts(prev => prev.map((c, i) => i === cIdx ? { ...c, name: val } : c));
                              }}
                              className={`flex-1 min-w-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-medium outline-none ${textTitle}`}
                            />
                            <div className="relative w-28 shrink-0">
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">TZS</span>
                              <input
                                type="number"
                                min="0"
                                value={cost.amount || ''}
                                placeholder="Amount"
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  setPosExtraCosts(prev => prev.map((c, i) => i === cIdx ? { ...c, amount: val } : c));
                                }}
                                className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-7 pr-2 py-1 text-xs font-bold outline-none ${textTitle}`}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setPosExtraCosts(prev => prev.filter((_, i) => i !== cIdx));
                                triggerHaptic('light');
                              }}
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-all shrink-0"
                              title="Remove Extra Cost"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setPosExtraCosts(prev => [...prev, { name: '', amount: 0 }]);
                        triggerHaptic('light');
                      }}
                      className={`w-full text-[10px] font-bold py-1 px-2 rounded-lg border border-dashed transition-all flex items-center justify-center gap-1 ${
                        isDark ? 'border-slate-700 hover:border-blue-500 text-slate-400 hover:text-blue-400 bg-slate-900/40' : 'border-slate-300 hover:border-blue-500 text-slate-500 hover:text-blue-600 bg-white'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Custom Extra Cost</span>
                    </button>
                  </div>

                  {/* Totals Summary */}
                  <div className={`p-3 rounded-2xl border space-y-1.5 text-xs ${isDark ? 'bg-slate-800/40 border-slate-700/60 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                    <div className="flex justify-between">
                      <span>Subtotal (Gross)</span>
                      <span className={`font-semibold ${textTitle}`}>{formatTZS(posCartGross)}</span>
                    </div>

                    {posIncludeVat && posTax > 0 && (
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>{posVatInclusiveGross < posCartGross ? `TRA VAT (${posVatPct}% on Taxable Items)` : `TRA VAT (${posVatPct}% Included)`}</span>
                        <span className="font-semibold">{formatTZS(posTax)}</span>
                      </div>
                    )}

                    {posDiscount > 0 && (
                      <div className="flex justify-between text-rose-500 font-bold">
                        <span>Discount Applied</span>
                        <span>-{formatTZS(posDiscountClamped)}</span>
                      </div>
                    )}

                    {posExtraCosts.length > 0 && posExtraCostsTotal > 0 && (
                      <div className="pt-1 border-t border-dashed border-slate-200 dark:border-slate-700 space-y-0.5">
                        <div className="flex justify-between text-blue-600 dark:text-blue-400 font-bold">
                          <span>Extra Services & Fees</span>
                          <span>+{formatTZS(posExtraCostsTotal)}</span>
                        </div>
                        {posExtraCosts.filter(c => c.name.trim() && Number(c.amount) > 0).map((cost, cIdx) => (
                          <div key={cIdx} className="flex justify-between text-[10px] text-slate-400 pl-1.5">
                            <span>• {cost.name}</span>
                            <span>+{formatTZS(cost.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={`flex justify-between items-center text-base font-black pt-1.5 border-t ${isDark ? 'border-slate-700 text-white' : 'border-slate-200 text-slate-900'}`}>
                      <span>Total Payable</span>
                      <span className="text-blue-500 text-lg font-black">{formatTZS(posTotal)}</span>
                    </div>
                  </div>

                  {/* Payment Method Selector / Split Payment Mode Switch */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-[11px] font-bold ${textSub}`}>Payment Method</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSplitPaymentMode(!isSplitPaymentMode);
                          triggerHaptic('light');
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all ${
                          isSplitPaymentMode
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-purple-600'
                        }`}
                      >
                        {isSplitPaymentMode ? '⚡ Split Tender Mode (Active)' : '+ Split Payment Tender'}
                      </button>
                    </div>

                    {!isSplitPaymentMode ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        {posAvailablePaymentMethods.map((m) => {
                          const isSelected = posPaymentMethod === m.name || (posPaymentMethod === m.type && !m.isDisabled);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              disabled={m.isDisabled}
                              onClick={() => {
                                if (m.isDisabled) {
                                  showAlert('Upcoming Payment Method', 'Orbi Pay is disabled during this release.', 'warning');
                                  return;
                                }
                                setPosPaymentMethod(m.name);
                              }}
                              className={`p-2 rounded-xl border text-center transition-all ${
                                m.isDisabled
                                  ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                  : isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-md font-black'
                                  : isDark
                                  ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 font-semibold'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 font-semibold'
                              }`}
                            >
                              <div className="text-xs truncate">{m.name}</div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      /* Split Tender Multi-Payment Allocator */
                      <div className="p-3 rounded-2xl border space-y-2.5 bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/40">
                        <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 dark:text-purple-300">
                          <span>Split Tender Allocation</span>
                          <span className="text-[10px] text-purple-600 dark:text-purple-400">
                            Total: {formatTZS(posTotal)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {splitPaymentsList.map((split, idx) => (
                            <div key={split.method} className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-semibold">
                                <span className="text-slate-700 dark:text-slate-300 truncate">{split.method}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const otherTotal = splitPaymentsList
                                      .filter((_, i) => i !== idx)
                                      .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                                    const remainder = Math.max(0, posTotal - otherTotal);
                                    setSplitPaymentsList(prev =>
                                      prev.map((s, i) => i === idx ? { ...s, amount: remainder } : s)
                                    );
                                  }}
                                  className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-bold"
                                >
                                  Fill Remainder
                                </button>
                              </div>
                              <div className="grid grid-cols-12 gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Amount (TZS)"
                                  value={split.amount || ''}
                                  onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    setSplitPaymentsList(prev =>
                                      prev.map((s, i) => i === idx ? { ...s, amount: val } : s)
                                    );
                                  }}
                                  className={`col-span-7 rounded-lg px-2.5 py-1.5 text-xs font-black border ${inputBg}`}
                                />
                                <input
                                  type="text"
                                  placeholder="Ref/Receipt #"
                                  value={split.reference || ''}
                                  onChange={(e) => {
                                    const ref = e.target.value;
                                    setSplitPaymentsList(prev =>
                                      prev.map((s, i) => i === idx ? { ...s, reference: ref } : s)
                                    );
                                  }}
                                  className={`col-span-5 rounded-lg px-2 py-1.5 text-[11px] font-mono border ${inputBg}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Live Split Balance Summary */}
                        <div className="flex items-center justify-between pt-2 border-t border-purple-200 dark:border-purple-900/40 text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            Allocated: <span className="font-black text-purple-600 dark:text-purple-400">{formatTZS(posSplitTotalPaid)}</span>
                          </span>
                          <span className={`font-black ${posSplitTotalPaid >= posTotal ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                            {posSplitTotalPaid >= posTotal
                              ? (posSplitTotalPaid > posTotal ? `Change Due: ${formatTZS(posSplitTotalPaid - posTotal)}` : 'Fully Paid ✓')
                              : `Short by ${formatTZS(posTotal - posSplitTotalPaid)}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>



                  {/* Loan / Credit Checkout Fields */}
                  {((posPaymentMethod || '').toLowerCase().includes('loan') || (posPaymentMethod || '').toLowerCase().includes('credit') || (posPaymentMethod || '').toLowerCase().includes('mkopo')) && (
                    <div className={`p-3 rounded-2xl border space-y-3 ${isDark ? 'bg-amber-950/20 border-amber-900/40 text-amber-200' : 'bg-amber-50/50 border-amber-200 text-amber-800'}`}>
                      <div className="flex items-center gap-2 text-xs font-black">
                        <Banknote className="w-4 h-4 text-amber-500" />
                        <span>Credit / Installment Sale Terms</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold mb-1 opacity-70">Down Payment (TZS)</label>
                          <input
                            type="number"
                            min="0"
                            max={posTotal}
                            value={posLoanDownPayment || ''}
                            onChange={e => setPosLoanDownPayment(Number(e.target.value) || 0)}
                            className={`w-full rounded-lg px-2 py-1.5 text-xs font-black border focus:border-amber-500 outline-none ${inputBg}`}
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold mb-1 opacity-70">Due Date</label>
                          <input
                            type="date"
                            value={posLoanDueDate}
                            onChange={e => setPosLoanDueDate(e.target.value)}
                            className={`w-full rounded-lg px-2 py-1.5 text-xs font-semibold border focus:border-amber-500 outline-none ${inputBg}`}
                          />
                        </div>
                        <div className="col-span-2">
                          <label htmlFor="pos-loan-national-id" className="block text-[10px] font-bold mb-1 opacity-70">Customer National ID (NIN) / Identity</label>
                          <input
                            id="pos-loan-national-id"
                            type="text"
                            inputMode="text"
                            autoComplete="off"
                            name="national-id"
                            spellCheck={false}
                            value={posLoanNationalId}
                            onChange={e => setPosLoanNationalId(e.target.value)}
                            className={`w-full rounded-lg px-2 py-1.5 text-xs font-semibold border focus:border-amber-500 outline-none ${inputBg}`}
                            placeholder="e.g. 19900101-12345-67890"
                          />
                        </div>
                        <div>
                          <label htmlFor="pos-loan-guarantor-name" className="block text-[10px] font-bold mb-1 opacity-70">Guarantor Name</label>
                          <input
                            id="pos-loan-guarantor-name"
                            type="text"
                            inputMode="text"
                            autoComplete="name"
                            name="guarantor-name"
                            autoCapitalize="words"
                            spellCheck={false}
                            value={posLoanGuarantorName}
                            onChange={e => setPosLoanGuarantorName(e.target.value)}
                            className={`w-full rounded-lg px-2 py-1.5 text-xs font-semibold border focus:border-amber-500 outline-none ${inputBg}`}
                            placeholder="Full Name"
                          />
                        </div>
                        <div>
                          <label htmlFor="pos-loan-guarantor-tel" className="block text-[10px] font-bold mb-1 opacity-70">Guarantor Phone</label>
                          <input
                            id="pos-loan-guarantor-tel"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            name="guarantor-tel"
                            value={posLoanGuarantorPhone}
                            onChange={e => setPosLoanGuarantorPhone(e.target.value)}
                            className={`w-full rounded-lg px-2 py-1.5 text-xs font-semibold border focus:border-amber-500 outline-none ${inputBg}`}
                            placeholder="Phone Number"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 mt-1 border-t border-amber-200 dark:border-amber-900/50">
                        <span className="text-[11px] font-bold opacity-80">Remaining Loan Balance:</span>
                        <span className="text-sm font-black">{formatTZS(Math.max(0, posTotal - posLoanDownPayment))}</span>
                      </div>
                    </div>
                  )}

                  {/* Complete Sale & Print Receipt Button */}
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowPOSSalePreview(true)}
                      disabled={posCart.length === 0}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Preview Sale & Checkout</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        if (posCart.length === 0) return;
                        const dummyOrder: Order = {
                          id: `PRO-${Date.now().toString().slice(-6)}`,
                          createdAt: new Date().toISOString(),
                          customerName: posCustomerName || 'Walk-in Customer',
                          customerEmail: '',
                          phone: posCustomerPhone || '',
                          shippingAddress: 'In-Store POS',
                          items: posCart.map(item => ({ product: item.product, quantity: item.quantity, price: getPosItemUnitPrice(item) })),
                          totalAmount: posTotal,
                          subtotal: posSubtotal,
                          tax: posTax,
                          discount: posDiscountClamped,
                          extraCosts: posExtraCosts.filter(c => c.name.trim() && Number(c.amount) > 0),
                          includeVat: posIncludeVat,
                          vatPercentage: posIncludeVat ? posVatPct : 0,
                          status: 'Pending',
                          paymentMethod: posPaymentMethod,
                          paymentStatus: 'Pending',
                        };
                        setSelectedOrderForInvoice(dummyOrder);
                      }}
                      disabled={posCart.length === 0}
                      className={`w-full ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-white'} disabled:opacity-50 font-extrabold py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm active:scale-[0.99]`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Generate Proforma Invoice (A4)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Floating POS Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent z-30 pointer-events-none">
              <div className={`p-4 rounded-2xl border shadow-2xl flex items-center justify-between gap-4 pointer-events-auto ${isDark ? 'bg-slate-900/90 border-slate-700 backdrop-blur-md' : 'bg-white/90 border-slate-200 backdrop-blur-md'}`}>
                <div className="flex-1 min-w-0">
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${textSub}`}>POS Cart</div>
                  <div className={`text-lg font-black text-blue-500`}>{formatTZS(posTotal)}</div>
                  <div className={`text-[10px] ${textSub}`}>{posCart.reduce((a, c) => a + c.quantity, 0)} items</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      document.getElementById('pos-cart-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`p-3 rounded-xl border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => setShowPOSSalePreview(true)}
                    disabled={posCart.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all active:scale-95 text-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Checkout</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Parked Orders Modal */}
            <AnimatePresence>
              {showParkedModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 space-y-4 ${cardBg}`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Pause className="w-5 h-5 text-amber-500" />
                        <h3 className={`text-base font-bold ${textTitle}`}>Parked / Held Customer Sales</h3>
                      </div>
                      <button onClick={() => setShowParkedModal(false)} className="text-slate-400 hover:text-slate-200">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                  {posParkedOrders.length === 0 ? (
                    <p className={`text-xs text-center py-8 ${textSub}`}>No parked orders at the moment.</p>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                      {posParkedOrders.map((parked) => {
                        const parkedTotal = parked.items.reduce((s, i) => s + (i.product.price * i.quantity), 0) - (parked.discount || 0);
                        return (
                          <div
                            key={parked.id}
                            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold text-xs ${textTitle}`}>{parked.customerName}</span>
                                {parked.customerPhone && (
                                  <span className="text-[10px] text-slate-400">({parked.customerPhone})</span>
                                )}
                              </div>
                              <div className={`text-[11px] mt-0.5 ${textSub}`}>
                                {parked.items.length} item(s) · {formatTZS(parkedTotal)}
                              </div>
                              <div className="text-[9px] text-slate-500 mt-1">
                                Held: {new Date(parked.createdAt).toLocaleTimeString()}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <motion.button
                                onClick={() => handleResumeParkedCart(parked.id)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Resume</span>
                              </motion.button>
                              <button
                                onClick={() => handleDeleteParkedCart(parked.id)}
                                className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/20"
                                title="Discard held sale"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={() => setShowParkedModal(false)}
                      className={`w-full py-2.5 rounded-xl border text-xs font-bold ${
                        isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        )}

        {/* SELL BY LOAN / CREDIT (Direct Sidebar Item) */}
        {activeTab === 'loans' && (
          <LoanTracker
            posTransactions={posTransactions}
            orders={orders}
            onUpdateLoanTransaction={updatePOSTransaction}
            onUpdateOrder={updateOrder}
            onDeletePOSTransaction={deletePOSTransaction}
            onOpenPOSReceipt={(tx) => setLastReceipt(tx)}
            onGoToPOSWithLoan={() => {
              setActiveTab('pos');
              setPosSubTab('register');
            }}
            isDark={isDark}
            cardBg={cardBg}
            inputBg={inputBg}
            textTitle={textTitle}
            textSub={textSub}
            showAlert={showAlert}
            activeCashierName={staff.find(s => s.id === (typeof localStorage !== 'undefined' ? localStorage.getItem('cashierId') : ''))?.name || 'Admin'}
            storeSettings={storeSettings}
          />
        )}

        {/* POS SALES HISTORY (Direct Sidebar Item) */}
        {activeTab === 'pos-sales' && (
          <POSSalesHistory
            posTransactions={posTransactions}
            storeSettings={storeSettings}
            onOpenReceipt={(tx) => setLastReceipt(tx)}
            onDeleteTransaction={deletePOSTransaction}
            onClearAllTransactions={clearPOSTransactions}
            isDark={isDark}
            cardBg={cardBg}
            inputBg={inputBg}
            textTitle={textTitle}
            textSub={textSub}
            showConfirm={showConfirm}
            showAlert={showAlert}
          />
        )}

        {/* DEBT & CREDIT ANALYTICS (Direct Sidebar Item) */}
        {activeTab === 'debt-analytics' && (
          <DebtAnalytics
            posTransactions={posTransactions}
            isDark={isDark}
            cardBg={cardBg}
            textTitle={textTitle}
            textSub={textSub}
            onGoToLoans={() => setActiveTab('loans')}
          />
        )}



        {activeTab === 'orders' && (

          <div className="space-y-6">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

              <div>

                <h1 className={`text-2xl font-extrabold tracking-tight ${textTitle}`}>Online Customer Orders</h1>

                <p className={`text-sm mt-1 ${textSub}`}>Fulfill online marketplace orders, assign couriers, manage tracking numbers, and sync live to customers.</p>

              </div>

              <div className="flex items-center gap-2 flex-wrap">

                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${isDark ? 'bg-slate-900 border-slate-800 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>

                  {orders.length} Total Orders

                </span>

                <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${isDark ? 'bg-amber-950/40 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>

                  {orders.filter(o => o.status === 'Pending' || o.status === 'Processing').length} Active Processing

                </span>

                {selectedOrderIds.length > 0 && deleteOrder && (

                  <button

                    onClick={async () => {

                      if (window.confirm(`Delete ${selectedOrderIds.length} selected orders?`)) {

                        for (const id of selectedOrderIds) {

                          await deleteOrder(id);

                        }

                        setSelectedOrderIds([]);

                      }

                    }}

                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 transition-all flex items-center gap-1.5 shadow-sm"

                  >

                    <Trash2 className="w-3.5 h-3.5" />

                    <span>Delete Selected ({selectedOrderIds.length})</span>

                  </button>

                )}

                {orders.length > 0 && clearOrders && (

                  <button

                    onClick={async () => {

                      if (window.confirm('Are you sure you want to clear ALL online orders?')) {

                        await clearOrders();

                        setSelectedOrderIds([]);

                      }

                    }}

                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 transition-all flex items-center gap-1.5 shadow-sm"

                  >

                    <Trash2 className="w-3.5 h-3.5" />

                    <span>Clear All Orders</span>

                  </button>

                )}

              </div>

            </div>



            <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>

              <div className="overflow-x-auto w-full">

                <table className="w-full text-left text-xs min-w-[900px]">

                  <thead>

                    <tr className={`border-b text-xs font-bold uppercase tracking-wider ${tableHeaderBg}`}>

                      <th className="p-4 w-10 text-center">

                        <input

                          type="checkbox"

                          onChange={(e) => setSelectedOrderIds(e.target.checked ? orders.map(o => o.id) : [])}

                          checked={orders.length > 0 && selectedOrderIds.length === orders.length}

                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"

                        />

                      </th>

                      <th className="p-4">Order ID & Date</th>

                      <th className="p-4">Customer & Contact</th>

                      <th className="p-4">Shipping Destination</th>

                      <th className="p-4">Items & Total</th>

                      <th className="p-4">Tracking & Courier</th>

                      <th className="p-4">Fulfillment Status</th>

                      <th className="p-4">Payment Status</th>

                      <th className="p-4 text-right">Actions & Dispatch</th>

                    </tr>

                  </thead>

                  <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>

                    {orders.map((o) => (

                      <tr key={o.id} className={`transition-colors ${tableRowHover}`}>

                        <td className="p-4 w-10 text-center">

                          <input

                            type="checkbox"

                            checked={selectedOrderIds.includes(o.id)}

                            onChange={(e) => setSelectedOrderIds(e.target.checked ? [...selectedOrderIds, o.id] : selectedOrderIds.filter(id => id !== o.id))}

                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"

                          />

                        </td>

                        <td className="p-4">

                          <div className={`font-bold ${textTitle}`}>{o.id}</div>

                          <div className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{formatToGMT3(o.createdAt)}</div>

                        </td>

                        <td className="p-4">

                          <div className={`font-semibold ${textTitle}`}>{o.customerName}</div>

                          <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{o.customerEmail}</div>

                          {(o.customerPhone || o.phone) && (

                            <div className="text-[11px] font-bold text-blue-500">{o.customerPhone || o.phone}</div>

                          )}

                        </td>

                        <td className={`p-4 max-w-xs ${textSub}`}>

                          <div className="truncate font-medium">{o.shippingAddress}</div>

                          {o.city && <span className="text-[10px] uppercase font-bold text-slate-400">{o.city}</span>}

                        </td>

                        <td className="p-4 whitespace-nowrap">

                          <div className={`font-bold ${textTitle}`}>{formatTZS(o.totalAmount)}</div>

                          {o.paidAmount !== undefined && o.paidAmount > 0 && o.paidAmount < o.totalAmount ? (

                            <div className="text-[10px] font-bold text-amber-500 flex flex-col">

                              <span>Paid: {formatTZS(o.paidAmount)}</span>

                              <span className="text-rose-500">Due: {formatTZS(o.totalAmount - o.paidAmount)}</span>

                            </div>

                          ) : (

                            <div className={`text-[11px] ${textSub}`}>{o.items.reduce((a, c) => a + c.quantity, 0)} items</div>

                          )}

                        </td>

                        <td className="p-4">

                          {o.trackingNumber ? (

                            <div className="space-y-0.5">

                              <span className="font-mono text-[11px] font-bold text-blue-500 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 block w-fit">

                                {o.trackingNumber}

                              </span>

                              {o.courierName && (

                                <span className={`text-[10px] block font-medium ${textSub}`}>

                                  via {o.courierName}

                                </span>

                              )}

                            </div>

                          ) : (

                            <span className="text-[11px] text-slate-400 italic">No tracking code yet</span>

                          )}

                        </td>

                        <td className="p-4">

                          <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border inline-flex items-center gap-1 ${

                            o.status === 'Delivered'

                              ? isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80' : 'bg-emerald-50 text-emerald-700 border-emerald-200'

                              : o.status === 'Shipped'

                              ? isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800/80' : 'bg-blue-50 text-blue-700 border-blue-200'

                              : o.status === 'Processing'

                              ? isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800/80' : 'bg-amber-50 text-amber-700 border-amber-200'

                              : o.status === 'Cancelled'

                              ? isDark ? 'bg-rose-950/60 text-rose-300 border-rose-800/80' : 'bg-rose-50 text-rose-700 border-rose-200'

                              : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'

                          }`}>

                            {o.status}

                          </span>

                        </td>

                        <td className="p-4">

                          <div className="flex flex-col gap-1.5 min-w-[150px]">

                            <select

                              value={o.paymentStatus || 'Pending'}

                              onChange={(e) => {

                                const newPaymentStatus = e.target.value as 'Pending' | 'Partial' | 'Paid' | 'Failed';

                                if (updateOrder) {

                                  const updatedPaidAmount = newPaymentStatus === 'Paid' ? o.totalAmount : newPaymentStatus === 'Pending' ? 0 : o.paidAmount;

                                  updateOrder({ 

                                    ...o, 

                                    paymentStatus: newPaymentStatus,

                                    paidAmount: updatedPaidAmount,

                                    outstandingBalance: Math.max(0, o.totalAmount - (updatedPaidAmount || 0))

                                  });

                                }

                              }}

                              className={`border rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${

                                o.paymentStatus === 'Paid'

                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'

                                  : o.paymentStatus === 'Partial'

                                  ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'

                                  : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'

                              }`}

                            >

                              <option value="Pending">Payment Pending</option>

                              <option value="Partial">Partial Payment Paid</option>

                              <option value="Paid">Paid & Confirmed</option>

                              <option value="Failed">Payment Failed</option>

                            </select>



                            {o.paymentStatus === 'Paid' ? (

                              <button

                                type="button"

                                onClick={() => {

                                  setLastReceipt({

                                    id: o.id,

                                    createdAt: o.createdAt,

                                    cashierName: 'Online Marketplace Admin',

                                    items: o.items,

                                    subtotal: o.totalAmount * 0.84,

                                    tax: o.totalAmount * 0.16,

                                    discount: 0,

                                    total: o.totalAmount,

                                    paymentMethod: o.paymentMethod || 'Online Bank Transfer / Mobile Money',

                                  });

                                }}

                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors flex items-center justify-center gap-1 shadow-sm w-fit active:scale-95"

                                title="Print / Download Official Payment Receipt"

                              >

                                <Printer className="w-3 h-3" />

                                <span>Get Payment Receipt</span>

                              </button>

                            ) : (

                              <div className="flex flex-col gap-1">

                                <span className="text-[10px] text-amber-500 dark:text-amber-400 font-medium">

                                  Receipt locked until marked Paid

                                </span>

                                {updateOrder && (

                                  <button

                                    type="button"

                                    onClick={() => updateOrder({ ...o, paymentStatus: 'Paid' })}

                                    className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] font-bold text-left w-fit transition-colors"

                                    title="Click to confirm customer payment as Paid"

                                  >

                                    + Confirm as Paid

                                  </button>

                                )}

                              </div>

                            )}

                          </div>

                        </td>

                        <td className="p-4 text-right">

                          <div className="flex items-center justify-end gap-2">

                            <button

                              type="button"

                              onClick={() => setSelectedOrderForInvoice(o)}

                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors flex items-center gap-1 shadow-sm"

                              title="Print or Download Official Tax Invoice (Available for all orders)"

                            >

                              <FileText className="w-3.5 h-3.5 text-blue-500" />

                              <span>Tax Invoice</span>

                            </button>



                            <select

                              value={o.status}

                              onChange={(e) => {

                                const newStatus = e.target.value as Order['status'];

                                if (updateOrder) {

                                  updateOrder({ ...o, status: newStatus });

                                } else {

                                  updateOrderStatus(o.id, newStatus);

                                }

                              }}

                              className={`border rounded-lg px-2.5 py-1.5 text-xs font-semibold ${

                                isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-200 text-slate-800'

                              }`}

                            >

                              <option value="Pending">Pending</option>

                              <option value="Processing">Processing</option>

                              <option value="Shipped">Shipped</option>

                              <option value="Delivered">Delivered</option>

                              <option value="Cancelled">Cancelled</option>

                            </select>



                            <button

                              onClick={() => {

                                setSelectedOrderForDispatch(o);

                                setDispatchStatus(o.status);

                                setDispatchTrackingNumber(o.trackingNumber || `GE-TRK-${Math.floor(Math.random() * 9000000 + 1000000)}`);

                                setDispatchCourier(o.courierName || 'DAR Express (Local)');

                                setDispatchEstimatedDelivery(o.estimatedDelivery || 'Within 24-48 Hours');

                                setDispatchNotes(o.notes || '');

                                const paidVal = o.paidAmount ?? (o.paymentStatus === 'Paid' ? o.totalAmount : 0);

                                setDispatchPaidAmount(paidVal);

                                setDispatchPaymentStatus(o.paymentStatus || (paidVal >= o.totalAmount ? 'Paid' : paidVal > 0 ? 'Partial' : 'Pending'));

                              }}

                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-sm"

                            >

                              <Truck className="w-3.5 h-3.5" />

                              <span>Dispatch & Track</span>

                            </button>

                            {deleteOrder && (

                              <button

                                onClick={async () => {

                                  if (window.confirm(`Delete order ${o.id}?`)) {

                                    await deleteOrder(o.id);

                                    setSelectedOrderIds(selectedOrderIds.filter(id => id !== o.id));

                                  }

                                }}

                                className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all shadow-sm"

                                title="Delete Order"

                              >

                                <Trash2 className="w-4 h-4" />

                              </button>

                            )}

                          </div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>



            {/* Dispatch & Order Tracking Modal */}

            {selectedOrderForDispatch && (

              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">

                <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 space-y-5 ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>

                  <div className="flex items-center justify-between border-b pb-4 dark:border-slate-800">

                    <div className="flex items-center gap-3">

                      <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">

                        <Truck className="w-5 h-5" />

                      </div>

                      <div>

                        <h3 className="font-extrabold text-base">Order Dispatch & Live Tracking</h3>

                        <p className="text-xs text-slate-500">Order #{selectedOrderForDispatch.id} • {selectedOrderForDispatch.customerName}</p>

                      </div>

                    </div>

                    <button

                      onClick={() => setSelectedOrderForDispatch(null)}

                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"

                    >

                      <X className="w-5 h-5" />

                    </button>

                  </div>



                  <div className="space-y-4">

                    <div>

                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">

                        Order Status

                      </label>

                      <select

                        value={dispatchStatus}

                        onChange={(e) => setDispatchStatus(e.target.value as any)}

                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold ${

                          isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'

                        }`}

                      >

                        <option value="Pending">Pending (Awaiting Confirmation)</option>

                        <option value="Processing">Processing (Packed & Ready)</option>

                        <option value="Shipped">Shipped (In Transit / Dispatched)</option>

                        <option value="Delivered">Delivered (Handed to Customer)</option>

                        <option value="Cancelled">Cancelled</option>

                      </select>

                    </div>



                    <div>

                      <div className="flex items-center justify-between mb-1.5">

                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">

                          Tracking Number

                        </label>

                        <button

                          type="button"

                          onClick={() => setDispatchTrackingNumber(`GE-TRK-${Math.floor(Math.random() * 9000000 + 1000000)}`)}

                          className="text-[11px] font-bold text-blue-500 hover:underline"

                        >

                          Generate New

                        </button>

                      </div>

                      <input

                        type="text"

                        value={dispatchTrackingNumber}

                        onChange={(e) => setDispatchTrackingNumber(e.target.value)}

                        placeholder="e.g. GE-TRK-7829103"

                        className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-mono font-bold ${

                          isDark ? 'bg-slate-800 border-slate-700 text-blue-400' : 'bg-slate-50 border-slate-200 text-blue-600'

                        }`}

                      />

                    </div>



                    <div className="grid grid-cols-2 gap-3">

                      <div>

                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">

                          Courier / Carrier

                        </label>

                        <select

                          value={dispatchCourier}

                          onChange={(e) => setDispatchCourier(e.target.value)}

                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium ${

                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'

                          }`}

                        >

                          <option value="DAR Express (Local)">DAR Express (Local)</option>

                          <option value="DHL Tanzania">DHL Tanzania</option>

                          <option value="Posta Tanzania">Posta Tanzania (EMS)</option>

                          <option value="Aramex Tanzania">Aramex Tanzania</option>

                          <option value="Own Store Fleet / Rider">Own Store Fleet / Rider</option>

                          <option value="Store Pickup (Kariakoo)">Store Pickup (Kariakoo)</option>

                        </select>

                      </div>



                      <div>

                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">

                          Estimated Delivery

                        </label>

                        <input

                          type="text"

                          value={dispatchEstimatedDelivery}

                          onChange={(e) => setDispatchEstimatedDelivery(e.target.value)}

                          placeholder="e.g. Within 24 Hours"

                          className={`w-full px-3.5 py-2.5 rounded-xl border text-xs ${

                            isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'

                          }`}

                        />

                      </div>

                    </div>



                    <div>

                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">

                        Dispatch Notes (Visible to Customer)

                      </label>

                      <textarea

                        rows={2}

                        value={dispatchNotes}

                        onChange={(e) => setDispatchNotes(e.target.value)}

                        placeholder="e.g. Package dispatched via express motorbike with seal inspection verified."

                        className={`w-full px-3.5 py-2 rounded-xl border text-xs ${

                          isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'

                        }`}

                      />

                    </div>

                    {/* Partial / Partial Payment Management for Online Orders */}
                    <div className={`p-3.5 rounded-xl border space-y-3 ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                          <span>Online Order Partial Payment & Delivery Balance</span>
                        </label>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                          dispatchPaymentStatus === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : dispatchPaymentStatus === 'Partial'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {dispatchPaymentStatus === 'Paid' ? 'Fully Paid' : dispatchPaymentStatus === 'Partial' ? 'Partial Deposit' : 'Unpaid / Pending'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs text-center font-bold p-2.5 rounded-lg bg-white dark:bg-slate-900 border dark:border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-normal">Total Order</span>
                          <span className="text-slate-800 dark:text-slate-100">{formatTZS(selectedOrderForDispatch.totalAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-500 block font-normal">Customer Paid</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{formatTZS(dispatchPaidAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-rose-500 block font-normal">Outstanding for Delivery</span>
                          <span className="text-rose-600 dark:text-rose-400 font-black">
                            {formatTZS(Math.max(0, selectedOrderForDispatch.totalAmount - dispatchPaidAmount))}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Customer Paid Amount (TZS)</label>
                          <input
                            type="number"
                            value={dispatchPaidAmount || ''}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setDispatchPaidAmount(val);
                              if (val >= selectedOrderForDispatch.totalAmount) {
                                setDispatchPaymentStatus('Paid');
                              } else if (val > 0) {
                                setDispatchPaymentStatus('Partial');
                              } else {
                                setDispatchPaymentStatus('Pending');
                              }
                            }}
                            placeholder="Amount customer paid"
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 mb-1">Payment Status</label>
                          <select
                            value={dispatchPaymentStatus}
                            onChange={(e) => {
                              const st = e.target.value as 'Pending' | 'Partial' | 'Paid' | 'Failed';
                              setDispatchPaymentStatus(st);
                              if (st === 'Paid') {
                                setDispatchPaidAmount(selectedOrderForDispatch.totalAmount);
                              } else if (st === 'Pending') {
                                setDispatchPaidAmount(0);
                              }
                            }}
                            className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          >
                            <option value="Pending">Pending (Unpaid)</option>
                            <option value="Partial">Partial Payment Paid</option>
                            <option value="Paid">Fully Paid (100%)</option>
                            <option value="Failed">Payment Failed</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setDispatchPaidAmount(selectedOrderForDispatch.totalAmount);
                            setDispatchPaymentStatus('Paid');
                          }}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          Full Payment (100%)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const half = Math.round(selectedOrderForDispatch.totalAmount * 0.5);
                            setDispatchPaidAmount(half);
                            setDispatchPaymentStatus('Partial');
                          }}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                        >
                          50% Deposit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDispatchPaidAmount(0);
                            setDispatchPaymentStatus('Pending');
                          }}
                          className="text-[10px] font-bold px-2 py-1 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20 transition-colors"
                        >
                          Clear Payment
                        </button>
                      </div>
                    </div>

                  </div>



                  <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-slate-800">

                    <button

                      type="button"

                      onClick={() => setSelectedOrderForDispatch(null)}

                      className={`px-4 py-2 rounded-xl border font-bold text-xs ${

                        isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'

                      }`}

                    >

                      Cancel

                    </button>

                    <button

                      type="button"

                      onClick={() => {

                        const updated: Order = {

                          ...selectedOrderForDispatch,

                          status: dispatchStatus,

                          trackingNumber: dispatchTrackingNumber,

                          courierName: dispatchCourier,

                          estimatedDelivery: dispatchEstimatedDelivery,

                          notes: dispatchNotes,

                          paymentStatus: dispatchPaymentStatus,

                          paidAmount: dispatchPaidAmount,

                          outstandingBalance: Math.max(0, selectedOrderForDispatch.totalAmount - dispatchPaidAmount),

                        };

                        if (updateOrder) {

                          updateOrder(updated);

                        } else {

                          updateOrderStatus(updated.id, dispatchStatus);

                        }

                        setSelectedOrderForDispatch(null);

                      }}

                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"

                    >

                      <Check className="w-4 h-4" />

                      <span>Save & Sync Globally</span>

                    </button>

                  </div>

                </div>

              </div>

            )}

          </div>

        )}



        {/* STAFF & STORE MANAGEMENT TAB */}

        {activeTab === 'staff' && (

          <div className="space-y-6 animate-in fade-in duration-300">

            {/* Header & Main Actions */}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

              <div>

                <div className="flex items-center gap-2.5">

                  <div className="p-2.5 bg-blue-600/10 text-blue-500 rounded-2xl border border-blue-500/20">

                    <Users className="w-6 h-6" />

                  </div>

                  <div>

                    <h1 className={`text-2xl font-black tracking-tight ${textTitle}`}>Staff & Store Team Management</h1>

                    <p className={`text-xs mt-0.5 ${textSub}`}>Manage administrative access, point-of-sale cashiers, inventory specialists, and access credentials.</p>

                  </div>

                </div>

              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">

                <button

                  type="button"

                  onClick={() => {
                    window.dispatchEvent(new Event('force-store-refresh'));
                  }}

                  className={`px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${

                    isDark

                      ? 'border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300'

                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'

                  }`}

                  title="Fetch latest real-time data from database"

                >

                  <RefreshCw className="w-3.5 h-3.5" />

                  <span>Refresh Live Data</span>

                </button>

                <button

                  type="button"

                  onClick={() => {

                    setEditingStaffMember(null);

                    setStaffForm({

                      name: '',

                      email: '',

                      phone: '',

                      role: 'Cashier / POS Associate',

                      password: `GE@${Math.floor(100000 + Math.random() * 900000)}`,

                      permissions: ['POS_ACCESS', 'VIEW_CATALOG'],

                      status: 'Active',

                      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80`

                    });

                    setIsStaffModalOpen(true);

                  }}

                  className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all w-full md:w-auto"

                >

                  <Plus className="w-4 h-4" />

                  <span>Add New Staff Member</span>

                </button>

              </div>

            </div>



            {/* Staff KPI Summary Cards */}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

              <div className={`p-4 rounded-2xl border ${cardBg}`}>

                <div className="flex items-center justify-between">

                  <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Total Staff</span>

                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">

                    <Users className="w-4 h-4" />

                  </div>

                </div>

                <div className={`text-2xl font-black mt-2 ${textTitle}`}>{staff.length}</div>

                <div className={`text-[11px] mt-1 text-slate-500`}>Official store operators</div>

              </div>



              <div className={`p-4 rounded-2xl border ${cardBg}`}>

                <div className="flex items-center justify-between">

                  <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Active Today</span>

                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">

                    <UserCheck className="w-4 h-4" />

                  </div>

                </div>

                <div className={`text-2xl font-black mt-2 text-emerald-500`}>

                  {staff.filter((s) => s.status === 'Active').length}

                </div>

                <div className={`text-[11px] mt-1 text-slate-500`}>Operational accounts</div>

              </div>



              <div className={`p-4 rounded-2xl border ${cardBg}`}>

                <div className="flex items-center justify-between">

                  <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Store Cashiers</span>

                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">

                    <ShoppingCart className="w-4 h-4" />

                  </div>

                </div>

                <div className={`text-2xl font-black mt-2 text-amber-500`}>

                  {staff.filter((s) => (s.role && (String(s.role || '').toLowerCase().includes('cashier') || s.role.toLowerCase().includes('sales') || s.role.toLowerCase().includes('pos')))).length}

                </div>

                <div className={`text-[11px] mt-1 text-slate-500`}>POS terminal access</div>

              </div>



              <div className={`p-4 rounded-2xl border ${cardBg}`}>

                <div className="flex items-center justify-between">

                  <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>System Admins</span>

                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">

                    <ShieldCheck className="w-4 h-4" />

                  </div>

                </div>

                <div className={`text-2xl font-black mt-2 text-purple-500`}>

                  {staff.filter((s) => (s.role && (String(s.role || '').toLowerCase().includes('admin') || s.role.toLowerCase().includes('manager')))).length}

                </div>

                <div className={`text-[11px] mt-1 text-slate-500`}>Full permissions</div>

              </div>

            </div>



            {/* Filter & Search Bar */}

            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${cardBg}`}>

              <div className="flex flex-1 items-center gap-3 w-full">

                <div className="relative flex-1">

                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

                  <input

                    type="text"

                    value={staffSearchQuery}

                    onChange={(e) => setStaffSearchQuery(e.target.value)}

                    placeholder="Search staff by name, email, phone, or role..."

                    className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium border ${inputBg}`}

                  />

                  {staffSearchQuery && (

                    <button

                      onClick={() => setStaffSearchQuery('')}

                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"

                    >

                      <X className="w-3.5 h-3.5" />

                    </button>

                  )}

                </div>



                <select

                  value={staffRoleFilter}

                  onChange={(e) => setStaffRoleFilter(e.target.value)}

                  className={`px-3 py-2 rounded-xl text-xs font-semibold border ${inputBg}`}

                >

                  <option value="All">All Roles</option>

                  <option value="Admin">Admin</option>

                  <option value="Manager">Store Manager</option>

                  <option value="Cashier">Cashier / POS</option>

                  <option value="Inventory">Inventory Specialist</option>

                  <option value="Support">Customer Support</option>

                  <option value="Technician">Service Technician</option>

                </select>



                <select

                  value={staffStatusFilter}

                  onChange={(e) => setStaffStatusFilter(e.target.value)}

                  className={`px-3 py-2 rounded-xl text-xs font-semibold border ${inputBg}`}

                >

                  <option value="All">All Statuses</option>

                  <option value="Active">Active Only</option>

                  <option value="Inactive">Inactive / Suspended</option>

                </select>

              </div>



              {/* View Switcher */}

              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/50 dark:bg-slate-800/80 shrink-0">

                <button

                  type="button"

                  onClick={() => setStaffViewMode('grid')}

                  className={`p-1.5 rounded-lg transition-colors ${staffViewMode === 'grid' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-slate-900 shadow') : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}

                  title="Grid View"

                >

                  <Grid className="w-4 h-4" />

                </button>

                <button

                  type="button"

                  onClick={() => setStaffViewMode('table')}

                  className={`p-1.5 rounded-lg transition-colors ${staffViewMode === 'table' ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-slate-900 shadow') : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}

                  title="Table View"

                >

                  <List className="w-4 h-4" />

                </button>

              </div>

            </div>



            {/* Staff Grid or Table */}

            {staff.length === 0 ? (

              <div className={`rounded-3xl border p-12 text-center ${cardBg}`}>

                <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-4 border border-blue-500/20">

                  <Users className="w-8 h-8" />

                </div>

                <h3 className={`text-lg font-bold ${textTitle}`}>No Staff Members Added Yet</h3>

                <p className={`text-xs mt-1.5 max-w-md mx-auto ${textSub}`}>

                  Add real store operators, managers, and POS cashiers to your database. Each member will have their own login access and permission settings.

                </p>

                <button

                  type="button"

                  onClick={() => {

                    setEditingStaffMember(null);

                    setStaffForm({

                      name: '',

                      email: '',

                      phone: '',

                      role: 'Cashier / POS Associate',

                      password: `GE@${Math.floor(100000 + Math.random() * 900000)}`,

                      permissions: ['POS_ACCESS', 'VIEW_CATALOG'],

                      status: 'Active',

                      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80`

                    });

                    setIsStaffModalOpen(true);

                  }}

                  className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/25 transition-all"

                >

                  <Plus className="w-4 h-4" />

                  <span>Create First Staff Member</span>

                </button>

              </div>

            ) : (

              <div>

                {staffViewMode === 'grid' ? (

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

                    {staff

                      .filter((st) => {

                        const q = (staffSearchQuery || '').toLowerCase().trim();

                        const matchesSearch = !q || (st.name && String(st.name).toLowerCase().includes(q)) || (st.email && String(st.email).toLowerCase().includes(q)) || (st.phone && st.phone.includes(q)) || (st.role && String(st.role).toLowerCase().includes(q));

                        const matchesRole = staffRoleFilter === 'All' || (st.role && String(st.role).toLowerCase().includes(String(staffRoleFilter || '').toLowerCase()));

                        const matchesStatus = staffStatusFilter === 'All' || st.status === staffStatusFilter;

                        return matchesSearch && matchesRole && matchesStatus;

                      })

                      .map((st) => {

                        const cashierSales = posTransactions.filter((tx) => 

                          (tx.cashierName && ((st.name && String(tx.cashierName || '').toLowerCase() === String(st.name).toLowerCase()) || (st.email && String(tx.cashierName || '').toLowerCase() === String(st.email).toLowerCase())))

                        );

                        const totalPosRevenue = cashierSales.reduce((acc, tx) => acc + (tx.total || 0), 0);



                        const isMemberAdmin = st.role ? String(st.role).toLowerCase().includes('admin') : false;

                        const isMemberManager = st.role ? String(st.role).toLowerCase().includes('manager') : false;

                        const isMemberCashier = st.role ? (String(st.role).toLowerCase().includes('cashier') || String(st.role || "").toLowerCase().includes('pos')) : false;



                        return (

                          <div

                            key={st.id}

                            className={`rounded-2xl border p-5 flex flex-col justify-between transition-all hover:shadow-xl hover:border-blue-500/40 relative group ${cardBg}`}

                          >

                            {/* Top Status & Role */}

                            <div>

                              <div className="flex items-start justify-between gap-2 mb-4">

                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${

                                  isMemberAdmin

                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'

                                    : isMemberManager

                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'

                                    : isMemberCashier

                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'

                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'

                                }`}>

                                  {st.role}

                                </span>



                                <button

                                  type="button"

                                  onClick={() => {

                                    const nextStatus = st.status === 'Active' ? 'Inactive' : 'Active';

                                    if (updateStaff) {

                                      updateStaff({ ...st, status: nextStatus });

                                    }

                                  }}

                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${

                                    st.status === 'Active'

                                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-700/50 hover:bg-red-950/40 hover:text-red-300 hover:border-red-700/50'

                                      : 'bg-red-950/40 text-red-400 border-red-700/50 hover:bg-emerald-950/40 hover:text-emerald-300 hover:border-emerald-700/50'

                                  }`}

                                  title="Click to toggle Active / Inactive"

                                >

                                  {st.status === 'Active' ? '● Active' : '○ Inactive'}

                                </button>

                              </div>



                              {/* Staff Avatar & Info */}

                              <div className="flex flex-col items-center text-center space-y-2 mb-4">

                                <div className="relative">

                                  {st.avatar ? (

                                    <img

                                      src={st.avatar}

                                      alt={st.name}

                                      className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-md"

                                    />

                                  ) : (

                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-md">

                                      {st.name.substring(0, 2).toUpperCase()}

                                    </div>

                                  )}

                                  <div className={`w-3.5 h-3.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 ${isDark ? 'border-slate-900' : 'border-white'} ${st.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-500'}`} />

                                </div>



                                <div>

                                  <h3 className={`font-black text-base leading-tight ${textTitle}`}>{st.name}</h3>

                                  <p className={`text-xs font-mono mt-1 ${textSub} truncate max-w-[200px]`}>{st.email}</p>

                                  {st.phone && (

                                    <p className="text-[11px] font-semibold text-slate-500 flex items-center justify-center gap-1 mt-0.5">

                                      <Phone className="w-3 h-3 text-emerald-500" />

                                      <span>{st.phone}</span>

                                    </p>

                                  )}

                                </div>

                              </div>



                              {/* Performance & Permissions tags */}

                              <div className={`p-2.5 rounded-xl border mb-4 space-y-1.5 ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200/80'}`}>

                                <div className="flex items-center justify-between text-[11px]">

                                  <span className="text-slate-400">POS Sales Volume:</span>

                                  <span className="font-extrabold text-blue-500 font-mono">

                                    {cashierSales.length} tx ({formatTZS(totalPosRevenue)})

                                  </span>

                                </div>

                                <div className="flex items-center justify-between text-[11px]">

                                  <span className="text-slate-400">System Access:</span>

                                  <span className="font-bold text-slate-300">

                                    {(st.permissions || ['POS_ACCESS']).length} modules

                                  </span>

                                </div>

                              </div>

                            </div>



                            {/* Action Buttons */}

                            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-1.5">

                              <button

                                type="button"

                                onClick={() => setViewingStaffProfile(st)}

                                className={`p-2 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-blue-400' : 'bg-slate-100 hover:bg-slate-200 text-blue-600'}`}

                                title="View Full Profile & Stats"

                              >

                                <Eye className="w-4 h-4" />

                              </button>



                              <button

                                type="button"

                                onClick={() => {

                                  setEditingStaffMember(st);

                                  setStaffForm({

                                    name: st.name,

                                    email: st.email,

                                    phone: st.phone || '',

                                    role: st.role,

                                    password: '',

                                    permissions: st.permissions || ['POS_ACCESS', 'VIEW_CATALOG'],

                                    status: st.status,

                                    avatar: st.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'

                                  });

                                  setIsStaffModalOpen(true);

                                }}

                                className={`p-2 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-amber-400' : 'bg-slate-100 hover:bg-slate-200 text-amber-600'}`}

                                title="Edit Staff Member"

                              >

                                <Edit className="w-4 h-4" />

                              </button>



                              <button

                                type="button"

                                onClick={() => {

                                  setResetPasswordStaff(st);

                                  setNewStaffPasswordInput(`GE@${Math.floor(100000 + Math.random() * 900000)}`);

                                  setResetSuccessMessage(null);

                                }}

                                className={`p-2 rounded-xl flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-purple-400' : 'bg-slate-100 hover:bg-slate-200 text-purple-600'}`}

                                title="Reset Staff Password"

                              >

                                <Key className="w-4 h-4" />

                              </button>



                              {deleteStaff && (

                                <button

                                  type="button"

                                  onClick={async () => {

                                    if (confirm(`Are you sure you want to remove staff member "${st.name}"? This action will revoke their login access immediately.`)) {

                                      if (st.avatar) {

                                        await deleteStorageImage(st.avatar);

                                      }

                                      deleteStaff(st.id);

                                    }

                                  }}

                                  className={`p-2 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors`}

                                  title="Delete Staff Member"

                                >

                                  <Trash2 className="w-4 h-4" />

                                </button>

                              )}

                            </div>

                          </div>

                        );

                      })}

                  </div>

                ) : (

                  /* Table View */

                  <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>

                    <div className="overflow-x-auto">

                      <table className="w-full text-left text-xs">

                        <thead>

                          <tr className={`border-b font-bold uppercase tracking-wider ${tableHeaderBg}`}>

                            <th className="p-4">Staff Member</th>

                            <th className="p-4">Role</th>

                            <th className="p-4">Contact Info</th>

                            <th className="p-4">POS Performance</th>

                            <th className="p-4">Status</th>

                            <th className="p-4 text-right">Actions</th>

                          </tr>

                        </thead>

                        <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>

                          {staff

                            .filter((st) => {

                              const q = (staffSearchQuery || '').toLowerCase().trim();

                              const matchesSearch = !q || (st.name && String(st.name).toLowerCase().includes(q)) || (st.email && String(st.email).toLowerCase().includes(q)) || (st.phone && st.phone.includes(q)) || (st.role && String(st.role).toLowerCase().includes(q));

                              const matchesRole = staffRoleFilter === 'All' || (st.role && String(st.role).toLowerCase().includes(String(staffRoleFilter || '').toLowerCase()));

                              const matchesStatus = staffStatusFilter === 'All' || st.status === staffStatusFilter;

                              return matchesSearch && matchesRole && matchesStatus;

                            })

                            .map((st) => {

                              const cashierSales = posTransactions.filter((tx) => 

                                (tx.cashierName && ((st.name && String(tx.cashierName || '').toLowerCase() === String(st.name).toLowerCase()) || (st.email && String(tx.cashierName || '').toLowerCase() === String(st.email).toLowerCase())))

                              );

                              const totalPosRevenue = cashierSales.reduce((acc, tx) => acc + (tx.total || 0), 0);



                              return (

                                <tr key={st.id} className={`transition-colors ${tableRowHover}`}>

                                  <td className="p-4">

                                    <div className="flex items-center gap-3">

                                      {st.avatar ? (

                                        <img src={st.avatar} alt={st.name} className="w-10 h-10 rounded-xl object-cover border" />

                                      ) : (

                                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center">

                                          {st.name.substring(0, 2).toUpperCase()}

                                        </div>

                                      )}

                                      <div>

                                        <div className={`font-bold ${textTitle}`}>{st.name}</div>

                                        <div className="text-[10px] text-slate-500 font-mono">ID: {st.id.substring(0, 12)}</div>

                                      </div>

                                    </div>

                                  </td>

                                  <td className="p-4">

                                    <span className="font-semibold text-blue-500">{st.role}</span>

                                  </td>

                                  <td className="p-4">

                                    <div className="space-y-0.5">

                                      <div className={`font-mono ${textSub}`}>{st.email}</div>

                                      {st.phone && <div className="text-slate-500 text-[11px]">{st.phone}</div>}

                                    </div>

                                  </td>

                                  <td className="p-4">

                                    <div className="font-mono">

                                      <span className="font-bold text-slate-200">{cashierSales.length} sales</span>

                                      <span className="text-slate-500 block text-[10px]">{formatTZS(totalPosRevenue)}</span>

                                    </div>

                                  </td>

                                  <td className="p-4">

                                    <button

                                      type="button"

                                      onClick={() => {

                                        const nextStatus = st.status === 'Active' ? 'Inactive' : 'Active';

                                        if (updateStaff) {

                                          updateStaff({ ...st, status: nextStatus });

                                        }

                                      }}

                                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${

                                        st.status === 'Active'

                                          ? 'bg-emerald-950/50 text-emerald-400 border-emerald-700/60'

                                          : 'bg-red-950/50 text-red-400 border-red-700/60'

                                      }`}

                                    >

                                      {st.status}

                                    </button>

                                  </td>

                                  <td className="p-4 text-right">

                                    <div className="flex items-center justify-end gap-1.5">

                                      <button

                                        type="button"

                                        onClick={() => setViewingStaffProfile(st)}

                                        className="p-1.5 rounded-lg bg-blue-600/10 text-blue-400 hover:bg-blue-600/20"

                                        title="View Profile"

                                      >

                                        <Eye className="w-4 h-4" />

                                      </button>

                                      <button

                                        type="button"

                                        onClick={() => {

                                          setEditingStaffMember(st);

                                          setStaffForm({

                                            name: st.name,

                                            email: st.email,

                                            phone: st.phone || '',

                                            role: st.role,

                                            password: '',

                                            permissions: st.permissions || ['POS_ACCESS', 'VIEW_CATALOG'],

                                            status: st.status,

                                            avatar: st.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'

                                          });

                                          setIsStaffModalOpen(true);

                                        }}

                                        className="p-1.5 rounded-lg bg-amber-600/10 text-amber-400 hover:bg-amber-600/20"

                                        title="Edit"

                                      >

                                        <Edit className="w-4 h-4" />

                                      </button>

                                      <button

                                        type="button"

                                        onClick={() => {

                                          setResetPasswordStaff(st);

                                          setNewStaffPasswordInput(`GE@${Math.floor(100000 + Math.random() * 900000)}`);

                                          setResetSuccessMessage(null);

                                        }}

                                        className="p-1.5 rounded-lg bg-purple-600/10 text-purple-400 hover:bg-purple-600/20"

                                        title="Reset Password"

                                      >

                                        <Key className="w-4 h-4" />

                                      </button>

                                      {deleteStaff && (

                                        <button

                                          type="button"

                                          onClick={async () => {

                                            if (confirm(`Delete staff member ${st.name}?`)) {

                                              if (st.avatar) {

                                                await deleteStorageImage(st.avatar);

                                              }

                                              deleteStaff(st.id);

                                            }

                                          }}

                                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"

                                          title="Delete"

                                        >

                                          <Trash2 className="w-4 h-4" />

                                        </button>

                                      )}

                                    </div>

                                  </td>

                                </tr>

                              );

                            })}

                        </tbody>

                      </table>

                    </div>

                  </div>

                )}

              </div>

            )}

          </div>

        )}



        {/* CUSTOMERS CRM TAB */}

        {activeTab === 'customers' && (() => {

          // Compute Aggregated Customers from Profiles and Orders

          const map = new Map<string, CustomerProfile & { ordersList: Order[] }>();



          // Ingest profiles

          (profiles || []).forEach((p) => {

            const email = String(p.email || '').toLowerCase().trim() || `user-${p.id}@genuine-electronics.com`;

            map.set(email, {

              id: p.id,

              name: p.fullName || p.full_name || p.displayName || email.split('@')[0],

              email: p.email || email,

              phone: p.phone || '',

              address: p.address || '',

              city: '',

              totalOrders: 0,

              totalItemsPurchased: 0,

              lifetimeValue: 0,

              lastOrder: undefined,

              notes: '',

              tier: 'Standard',

              registeredAt: (p as any).created_at || (p as any).createdAt,

              ordersList: [],

            });

          });



          // Ingest Orders

          orders.forEach((ord) => {

            const email = (ord.customerEmail || '').toLowerCase().trim();

            if (!email) return;



            let cust = map.get(email);

            if (!cust) {

              cust = {

                id: `cust-${email.replace(/[^a-zA-Z0-9]/g, '_')}`,

                name: ord.customerName || email.split('@')[0],

                email: ord.customerEmail,

                phone: ord.customerPhone || ord.phone || '',

                address: ord.shippingAddress || '',

                city: ord.city || '',

                totalOrders: 0,

                totalItemsPurchased: 0,

                lifetimeValue: 0,

                lastOrder: undefined,

                notes: '',

                tier: 'Standard',

                ordersList: [],

              };

              map.set(email, cust);

            }



            const itemsInOrd = (ord.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

            cust.totalOrders += 1;

            cust.totalItemsPurchased = (cust.totalItemsPurchased || 0) + itemsInOrd;

            cust.lifetimeValue += (ord.totalAmount || 0);

            cust.ordersList.push(ord);

            if (!cust.phone && (ord.customerPhone || ord.phone)) {

              cust.phone = ord.customerPhone || ord.phone || '';

            }

            if (!cust.address && ord.shippingAddress) {

              cust.address = ord.shippingAddress;

            }

            if (!cust.city && ord.city) {

              cust.city = ord.city;

            }

            if (!cust.lastOrder || new Date(ord.createdAt) > new Date(cust.lastOrder)) {

              cust.lastOrder = ord.createdAt;

            }

          });



          // Compute tiers & sort orders by date

          const customerList = Array.from(map.values()).map((c) => {

            let tier: CustomerProfile['tier'] = 'Standard';

            if (c.lifetimeValue >= 2000000) {

              tier = 'Platinum VIP';

            } else if (c.lifetimeValue >= 1000000) {

              tier = 'Gold VIP';

            } else if (c.lifetimeValue >= 500000 || c.totalOrders >= 3) {

              tier = 'Silver';

            }

            c.tier = tier;

            c.ordersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            return c;

          });



          const totalCustomerCount = customerList.length;

          const vipCustomerCount = customerList.filter((c) => c.tier?.includes('VIP') || c.tier === 'Platinum VIP' || c.tier === 'Gold VIP').length;

          const repeatCustomerCount = customerList.filter((c) => c.totalOrders >= 2).length;

          const totalCrmLifetimeValue = customerList.reduce((acc, c) => acc + c.lifetimeValue, 0);



          const filteredList = customerList.filter((c) => {

            const q = (customerSearchQuery || '').toLowerCase().trim();
            const matchesSearch = !q || 
              String(c.name || '').toLowerCase().includes(q) || 
              String(c.email || '').toLowerCase().includes(q) || 
              String(c.phone || '').includes(q) || 
              String(c.city || '').toLowerCase().includes(q) || 
              String(c.address || '').toLowerCase().includes(q);

            const matchesTier = customerTierFilter === 'All' || c.tier === customerTierFilter;

            return matchesSearch && matchesTier;

          }).sort((a, b) => {

            if (customerSortBy === 'lifetimeValue') return b.lifetimeValue - a.lifetimeValue;

            if (customerSortBy === 'totalOrders') return b.totalOrders - a.totalOrders;

            if (customerSortBy === 'lastOrder') {

              const timeA = a.lastOrder ? new Date(a.lastOrder).getTime() : 0;

              const timeB = b.lastOrder ? new Date(b.lastOrder).getTime() : 0;

              return timeB - timeA;

            }

            return a.name.localeCompare(b.name);

          });



          const handleExportCsv = () => {

            const headers = ['Name', 'Email', 'Phone', 'Address', 'City', 'Tier', 'Total Orders', 'Lifetime Value (TZS)', 'Last Order Date'];

            const rows = filteredList.map((c) => [

              `"${c.name.replace(/"/g, '""')}"`,

              `"${c.email}"`,

              `"${c.phone || ''}"`,

              `"${(c.address || '').replace(/"/g, '""')}"`,

              `"${c.city || ''}"`,

              `"${c.tier || 'Standard'}"`,

              c.totalOrders,

              c.lifetimeValue,

              c.lastOrder ? `"${new Date(c.lastOrder).toLocaleDateString()}"` : '""'

            ]);



            const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

            const encodedUri = encodeURI(csvContent);

            const link = document.createElement('a');

            link.setAttribute('href', encodedUri);

            link.setAttribute('download', `genuine_electronics_customers_${new Date().toISOString().slice(0, 10)}.csv`);

            document.body.appendChild(link);

            link.click();

            document.body.removeChild(link);

          };



          return (

            <div className="space-y-6 animate-in fade-in duration-300">

              {/* CRM Header */}

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

                <div className="flex items-center gap-2.5">

                  <div className="p-2.5 bg-emerald-600/10 text-emerald-500 rounded-2xl border border-emerald-500/20">

                    <UserCheck className="w-6 h-6" />

                  </div>

                  <div>

                    <h1 className={`text-2xl font-black tracking-tight ${textTitle}`}>Customer Relationship Management (CRM)</h1>

                    <p className={`text-xs mt-0.5 ${textSub}`}>Unified customer profiles, purchasing history, VIP tier segments, and direct communication.</p>

                  </div>

                </div>



                <div className="flex items-center gap-3 w-full md:w-auto">

                  <button

                    type="button"

                    onClick={handleExportCsv}

                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${

                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-sm'

                    }`}

                  >

                    <Download className="w-4 h-4 text-emerald-500" />

                    <span>Export Customers (CSV)</span>

                  </button>

                </div>

              </div>



              {/* CRM Metrics Overview */}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                <div className={`p-4 rounded-2xl border ${cardBg}`}>

                  <div className="flex items-center justify-between">

                    <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Customer Base</span>

                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">

                      <Users className="w-4 h-4" />

                    </div>

                  </div>

                  <div className={`text-2xl font-black mt-2 ${textTitle}`}>{totalCustomerCount}</div>

                  <div className="text-[11px] mt-1 text-slate-500">Active accounts & buyers</div>

                </div>



                <div className={`p-4 rounded-2xl border ${cardBg}`}>

                  <div className="flex items-center justify-between">

                    <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>VIP Clients</span>

                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">

                      <Award className="w-4 h-4" />

                    </div>

                  </div>

                  <div className={`text-2xl font-black mt-2 text-indigo-400`}>{vipCustomerCount}</div>

                  <div className="text-[11px] mt-1 text-slate-500">&gt; 1M TZS lifetime spend</div>

                </div>



                <div className={`p-4 rounded-2xl border ${cardBg}`}>

                  <div className="flex items-center justify-between">

                    <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Repeat Buyers</span>

                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">

                      <RefreshCw className="w-4 h-4" />

                    </div>

                  </div>

                  <div className={`text-2xl font-black mt-2 text-emerald-400`}>{repeatCustomerCount}</div>

                  <div className="text-[11px] mt-1 text-slate-500">2+ completed orders</div>

                </div>



                <div className={`p-4 rounded-2xl border ${cardBg}`}>

                  <div className="flex items-center justify-between">

                    <span className={`text-xs font-bold uppercase tracking-wider ${textSub}`}>Total Spend</span>

                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">

                      <DollarSign className="w-4 h-4" />

                    </div>

                  </div>

                  <div className={`text-lg font-black mt-2 text-amber-400 truncate`}>{formatTZS(totalCrmLifetimeValue)}</div>

                  <div className="text-[11px] mt-1 text-slate-500">Gross customer lifetime value</div>

                </div>

              </div>



              {/* Filters, Search & Sort */}

              <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${cardBg}`}>

                <div className="flex flex-1 items-center gap-3 w-full">

                  <div className="relative flex-1">

                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input

                      type="text"

                      value={customerSearchQuery}

                      onChange={(e) => setCustomerSearchQuery(e.target.value)}

                      placeholder="Search customers by name, email, phone, city, or address..."

                      className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium border ${inputBg}`}

                    />

                    {customerSearchQuery && (

                      <button

                        onClick={() => setCustomerSearchQuery('')}

                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"

                      >

                        <X className="w-3.5 h-3.5" />

                      </button>

                    )}

                  </div>



                  <select

                    value={customerTierFilter}

                    onChange={(e) => setCustomerTierFilter(e.target.value)}

                    className={`px-3 py-2 rounded-xl text-xs font-semibold border ${inputBg}`}

                  >

                    <option value="All">All Tiers</option>

                    <option value="Platinum VIP">Platinum VIP (&gt;2M TZS)</option>

                    <option value="Gold VIP">Gold VIP (&gt;1M TZS)</option>

                    <option value="Silver">Silver (&gt;500k TZS)</option>

                    <option value="Standard">Standard</option>

                  </select>



                  <select

                    value={customerSortBy}

                    onChange={(e) => setCustomerSortBy(e.target.value as any)}

                    className={`px-3 py-2 rounded-xl text-xs font-semibold border ${inputBg}`}

                  >

                    <option value="lifetimeValue">Sort: Highest Value (TZS)</option>

                    <option value="totalOrders">Sort: Most Orders</option>

                    <option value="lastOrder">Sort: Most Recent Order</option>

                    <option value="name">Sort: Name (A-Z)</option>

                  </select>

                </div>

              </div>



              {/* Customers CRM Table */}

              <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>

                <div className="overflow-x-auto">

                  <table className="w-full text-left text-xs">

                    <thead>

                      <tr className={`border-b font-bold uppercase tracking-wider ${tableHeaderBg}`}>

                        <th className="p-4">Customer Profile</th>

                        <th className="p-4">Contact Details</th>

                        <th className="p-4">Location / City</th>

                        <th className="p-4">Tier</th>

                        <th className="p-4">Orders</th>

                        <th className="p-4">Lifetime Value</th>

                        <th className="p-4">Last Activity</th>

                        <th className="p-4 text-right">Actions</th>

                      </tr>

                    </thead>

                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>

                      {filteredList.length === 0 ? (

                        <tr>

                          <td colSpan={8} className="p-8 text-center text-slate-400">

                            No matching customer profiles found in database.

                          </td>

                        </tr>

                      ) : (

                        filteredList.map((cust) => (

                          <tr key={cust.id} className={`transition-colors ${tableRowHover}`}>

                            <td className="p-4">

                              <div className="flex items-center gap-3">

                                <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 ${

                                  cust.tier === 'Platinum VIP'

                                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20'

                                    : cust.tier === 'Gold VIP'

                                    ? 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20'

                                    : cust.tier === 'Silver'

                                    ? 'bg-gradient-to-tr from-slate-600 to-slate-500 text-white'

                                    : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'

                                }`}>

                                  {cust.name.substring(0, 2).toUpperCase()}

                                </div>

                                <div>

                                  <div className={`font-bold ${textTitle}`}>{cust.name}</div>

                                  <div className="text-[10px] text-slate-500 font-mono">{cust.email}</div>

                                </div>

                              </div>

                            </td>



                            <td className="p-4">

                              <div className="space-y-0.5">

                                {cust.phone ? (

                                  <a

                                    href={`tel:${cust.phone}`}

                                    className="text-slate-300 hover:text-blue-400 flex items-center gap-1 font-mono"

                                  >

                                    <Phone className="w-3 h-3 text-emerald-500" />

                                    <span>{cust.phone}</span>

                                  </a>

                                ) : (

                                  <span className="text-slate-500 italic text-[10px]">No phone on file</span>

                                )}

                              </div>

                            </td>



                            <td className="p-4">

                              <div className="text-slate-400 truncate max-w-[140px]">

                                {cust.city || (cust.address ? cust.address.slice(0, 20) + '...' : 'Dar es Salaam')}

                              </div>

                            </td>



                            <td className="p-4">

                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${

                                cust.tier === 'Platinum VIP'

                                  ? 'bg-purple-950/50 text-purple-300 border-purple-700/60'

                                  : cust.tier === 'Gold VIP'

                                  ? 'bg-amber-950/50 text-amber-300 border-amber-700/60'

                                  : cust.tier === 'Silver'

                                  ? 'bg-slate-800 text-slate-300 border-slate-700'

                                  : 'bg-blue-950/40 text-blue-300 border-blue-800/50'

                              }`}>

                                {cust.tier}

                              </span>

                            </td>



                            <td className="p-4">

                              <div className="font-extrabold text-slate-200">{cust.totalOrders} {cust.totalOrders === 1 ? 'order' : 'orders'}</div>

                              <div className="text-[10px] text-purple-400 font-bold flex items-center gap-1 mt-0.5">

                                <Package className="w-3 h-3 text-purple-400 shrink-0" />

                                <span>{cust.totalItemsPurchased || 0} items purchased</span>

                              </div>

                            </td>



                            <td className="p-4 font-mono font-black text-emerald-400 whitespace-nowrap">

                              {formatTZS(cust.lifetimeValue)}

                            </td>



                            <td className="p-4 text-slate-400 whitespace-nowrap">

                              {cust.lastOrder ? new Date(cust.lastOrder).toLocaleDateString() : 'N/A'}

                            </td>



                            <td className="p-4 text-right">

                              <div className="flex items-center justify-end gap-1.5">

                                {cust.phone && (

                                  <a

                                    href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${cust.name}, this is Genuine Electronics Tanzania regarding your orders.`)}`}

                                    target="_blank"

                                    rel="noreferrer"

                                    className="p-1.5 rounded-lg bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20"

                                    title="Chat on WhatsApp"

                                  >

                                    <MessageCircle className="w-4 h-4" />

                                  </a>

                                )}

                                <button

                                  type="button"

                                  onClick={() => setSelectedCustomerForCrm(cust)}

                                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-blue-600/20 transition-all"

                                >

                                  <Eye className="w-3.5 h-3.5" />

                                  <span>View CRM Profile</span>

                                </button>

                                {resetCustomerPassword && (

                                  <button

                                    type="button"

                                    onClick={() => {

                                      setResetPasswordCustomer(cust);

                                      setNewCustomerPasswordInput(`GE@${Math.floor(100000 + Math.random() * 900000)}`);

                                      setCustomerResetSuccessMessage(null);

                                    }}

                                    className="p-1.5 rounded-lg text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"

                                    title="Direct Password Reset (No Email Needed)"

                                  >

                                    <Key className="w-4 h-4" />

                                  </button>

                                )}

                                {(deleteCustomer || deleteUser) && (

                                  <button

                                    type="button"

                                    onClick={() => {

                                      if (confirm(`Are you sure you want to delete customer account "${cust.name}" (${cust.email})? This action cannot be undone.`)) {

                                        const handler = deleteCustomer || deleteUser;

                                        if (handler) handler(cust.id, cust.email);

                                      }

                                    }}

                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"

                                    title="Delete Customer Account"

                                  >

                                    <Trash2 className="w-4 h-4" />

                                  </button>

                                )}

                              </div>

                            </td>

                          </tr>

                        ))

                      )}

                    </tbody>

                  </table>

                </div>

              </div>

            </div>

          );

        })()}



        {activeTab === 'offers' && (

          <div className="space-y-6 max-w-7xl mx-auto pb-8">

            {/* Premium Offers Header */}
            <div className={`relative overflow-hidden rounded-3xl border p-6 sm:p-7 ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border-slate-800' : 'bg-gradient-to-br from-white via-white to-amber-50 border-slate-200 shadow-sm'}`}>
              <div className="absolute -right-16 -top-20 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
              <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                      <Zap className="w-3 h-3 fill-current" /> Campaign Studio
                    </span>
                    <span className={`text-[10px] font-bold ${textSub}`}>Ctrl + 8</span>
                  </div>
                  <h1 className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5 ${textTitle}`}>
                    Promotional Campaigns & Deals
                  </h1>
                  <p className={`text-sm mt-2 max-w-2xl leading-relaxed ${textSub}`}>
                    Control storefront promotions, launch category markdowns, and manage product-level offers from one clean workspace.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-0 lg:min-w-[430px]">
                  {[
                    ['Live Offers', offerStats.live, 'text-emerald-500'],
                    ['Regular', offerStats.regular, 'text-slate-400'],
                    ['Featured', offerStats.featured, 'text-blue-500'],
                    ['Avg. Discount', `${offerStats.averageMarkdown.toFixed(0)}%`, 'text-amber-500']
                  ].map(([label, value, color]) => (
                    <div key={label} className={`rounded-2xl border px-3 py-3 ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
                      <p className={`text-[9px] font-black uppercase tracking-wider ${textSub}`}>{label}</p>
                      <p className={`text-lg font-black mt-1 ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>



            {/* Top Control Center: Two-Column Dashboard Grid */}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              

              {/* Card 1: Storefront Active Campaign Control */}

              <div className={`lg:col-span-7 p-6 rounded-3xl border shadow-sm ${cardBg} hover:shadow-md transition-shadow flex flex-col justify-between`}>

                <div className="space-y-4">

                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">

                    <div className="flex items-center gap-2">

                      <Sparkles className="w-4 h-4 text-blue-500" />

                      <h3 className={`font-extrabold text-sm uppercase tracking-wider ${textTitle}`}>

                        Countdown Promo Banner

                      </h3>

                    </div>

                    

                    <label className="relative inline-flex items-center cursor-pointer">

                      <input

                        type="checkbox"

                        checked={!!settingsForm.offerEnabled}

                        onChange={(e) => setSettingsForm({ ...settingsForm, offerEnabled: e.target.checked })}

                        className="sr-only peer"

                      />

                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>

                      <span className={`ml-2 text-xs font-bold ${textTitle}`}>

                        {settingsForm.offerEnabled ? 'Active' : 'Disabled'}

                      </span>

                    </label>

                  </div>



                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    <div>

                      <label className={`block text-[11px] font-black uppercase tracking-wider mb-1 ${textSub}`}>Campaign Main Title</label>

                      <input

                        type="text"

                        value={settingsForm.offerTitle || 'LIMITED TIME OFFERS'}

                        onChange={(e) => setSettingsForm({ ...settingsForm, offerTitle: e.target.value })}

                        placeholder="e.g. FLASH SALE - UP TO 40% OFF"

                        className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputBg}`}

                      />

                    </div>

                    <div>

                      <label className={`block text-[11px] font-black uppercase tracking-wider mb-1 ${textSub}`}>Badge Label Text</label>

                      <input

                        type="text"

                        value={settingsForm.offerBadgeText || 'SPECIAL HARDWARE DEALS'}

                        onChange={(e) => setSettingsForm({ ...settingsForm, offerBadgeText: e.target.value })}

                        placeholder="e.g. GENUINE HARDWARE DEALS"

                        className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputBg}`}

                      />

                    </div>

                  </div>



                  <div>

                    <label className={`block text-[11px] font-black uppercase tracking-wider mb-1 ${textSub}`}>Campaign Description / Subtitle</label>

                    <input

                      type="text"

                      value={settingsForm.offerSubtitle || 'Certified Official Manufacturer Warranties. Authentic Electronics Delivered Across Tanzania.'}

                      onChange={(e) => setSettingsForm({ ...settingsForm, offerSubtitle: e.target.value })}

                      className={`w-full px-3 py-2 rounded-xl border text-xs font-medium ${inputBg}`}

                    />

                  </div>



                  <div className="p-3.5 rounded-xl bg-slate-950/20 border border-slate-200/10 dark:bg-slate-950/40 space-y-2">

                    <label className="block text-[10px] font-extrabold text-blue-500 uppercase tracking-widest">

                      Target Expiration Date & Time

                    </label>

                    <div className="flex flex-wrap items-center gap-3">

                      <input

                        type="datetime-local"

                        value={settingsForm.offerEndsAt ? settingsForm.offerEndsAt.slice(0, 16) : ''}

                        onChange={(e) => setSettingsForm({ ...settingsForm, offerEndsAt: e.target.value ? new Date(e.target.value).toISOString() : '' })}

                        className={`px-3 py-1.5 rounded-lg border text-xs font-extrabold text-blue-500 bg-slate-950/30 ${isDark ? 'border-slate-800' : 'border-slate-300'}`}

                      />

                      <div className="flex flex-wrap items-center gap-1">

                        {[

                          { label: '+24h', hours: 24 },

                          { label: '+48h', hours: 48 },

                          { label: '+72h', hours: 72 },

                          { label: '+7d', hours: 168 }

                        ].map((preset) => (

                          <button

                            key={preset.label}

                            type="button"

                            onClick={() => {

                              const d = new Date();

                              d.setHours(d.getHours() + preset.hours);

                              setSettingsForm({ ...settingsForm, offerEndsAt: d.toISOString() });

                            }}

                            className="px-2 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase transition-all"

                          >

                            {preset.label}

                          </button>

                        ))}

                      </div>

                    </div>

                  </div>

                </div>



                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">

                  <p className="text-[10px] text-slate-400 font-bold max-w-[240px]">

                    Note: Banner displays are live. Changes auto-save within 500ms.

                  </p>

                  <button

                    type="button"

                    onClick={(e) => handleSaveSettings(e as any)}

                    disabled={isSavingSettings}

                    className="px-4.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-md shadow-blue-600/10 flex items-center gap-1.5 transition-all disabled:opacity-50"

                  >

                    <CheckCircle className="w-3.5 h-3.5 text-white" />

                    <span>Publish Banner Changes</span>

                  </button>

                </div>

              </div>



              {/* Card 2: Enterprise Category-Wide Bulk Markdown Tool */}

              <div className={`lg:col-span-5 p-6 rounded-3xl border shadow-sm ${cardBg} hover:shadow-md transition-shadow flex flex-col justify-between`}>

                <div className="space-y-4">

                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">

                    <Tags className="w-4 h-4 text-blue-500" />

                    <h3 className={`font-extrabold text-sm uppercase tracking-wider ${textTitle}`}>

                      Category-Wide Bulk Markdown

                    </h3>

                  </div>



                  <p className="text-xs text-slate-400 leading-relaxed">

                    Instantly discount multiple products! This markdown utility auto-recalculates selling prices from original product prices across your selected category.

                  </p>



                  <div className="space-y-3">

                    <div>

                      <label className={`block text-[11px] font-black uppercase tracking-wider mb-1 ${textSub}`}>

                        Select Target Product Category

                      </label>

                      <select

                        value={bulkCategory}

                        onChange={(e) => setBulkCategory(e.target.value)}

                        className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${inputBg}`}

                      >

                        <option value="All">All Categories ({products.length} products)</option>

                        {(() => {

                          const categoriesList = categories && categories.length > 0

                            ? categories.map(c => c.name)

                            : Array.from(new Set(products.map(p => p.category).filter(Boolean)));

                          return categoriesList.map(cat => (

                            <option key={cat} value={cat}>

                              {cat} ({products.filter(p => p.category === cat).length} products)

                            </option>

                          ));

                        })()}

                      </select>

                    </div>



                    <div>

                      <label className={`block text-[11px] font-black uppercase tracking-wider mb-1 ${textSub}`}>

                        Apply Markdown Percentage Discount

                      </label>

                      <div className="grid grid-cols-5 gap-1.5">

                        {[5, 10, 15, 20, 25].map((pct) => (

                          <button

                            key={pct}

                            type="button"

                            onClick={() => setBulkPercentage(pct)}

                            className={`py-1.5 rounded-lg border text-xs font-extrabold transition-all ${

                              bulkPercentage === pct

                                ? 'bg-blue-600 text-white border-transparent shadow-sm scale-105'

                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'

                            }`}

                          >

                            {pct}%

                          </button>

                        ))}

                      </div>

                      <div className="mt-2 flex items-center gap-2">

                        <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Custom discount:</span>

                        <input

                          type="number"

                          min="1"

                          max="95"

                          value={bulkPercentage}

                          onChange={(e) => setBulkPercentage(Math.max(1, Math.min(95, Number(e.target.value) || 1)))}

                          className={`w-16 px-2 py-1 rounded-lg border text-center text-xs font-bold ${inputBg}`}

                        />

                        <span className="text-xs font-bold text-slate-400">%</span>

                      </div>

                    </div>

                  </div>

                </div>



                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">

                  {bulkDiscountFeedback && (

                    <div className="p-2.5 rounded-xl text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-center">

                      {bulkDiscountFeedback}

                    </div>

                  )}



                  <button

                    type="button"

                    onClick={handleApplyBulkDiscount}

                    disabled={isApplyingBulk}

                    className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-600/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50"

                  >

                    {isApplyingBulk ? (

                      <>

                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />

                        <span>Applying Discounts...</span>

                      </>

                    ) : (

                      <>

                        <Tags className="w-3.5 h-3.5" />

                        <span>Apply {bulkPercentage}% Bulk Discount</span>

                      </>

                    )}

                  </button>

                </div>

              </div>

            </div>



            {/* Individual Product Discounts Table Center */}

            <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm ${cardBg} space-y-4`}>

              

              {/* Toolbar */}

              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">

                <div className="flex items-center gap-2.5">

                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/15">

                    <List className="w-4 h-4" />

                  </div>

                  <div>

                    <h3 className={`font-extrabold text-sm ${textTitle}`}>

                      Discounts & Deals Inventory

                    </h3>

                    <p className="text-[10px] text-slate-400 font-bold">

                      Search, view active campaigns, and configure custom discount percentages per electronic piece.

                    </p>

                  </div>

                </div>



                <button

                  type="button"

                  onClick={handleOpenAddModal}

                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"

                >

                  <Plus className="w-3.5 h-3.5" />

                  <span>Upload Promotional Product</span>

                </button>

              </div>



              {/* Filters & Search Row */}

              <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-1 p-3 rounded-2xl ${isDark ? 'bg-slate-950/50 border border-slate-800' : 'bg-slate-50/80 border border-slate-200'}`}>

                {/* Search input */}

                <div className="w-full lg:flex-1 lg:max-w-xl relative">

                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">

                    <Search className="h-3.5 w-3.5 text-slate-400" />

                  </span>

                  <input

                    type="text"

                    value={discountsSearch}

                    onChange={(e) => setDiscountsSearch(e.target.value)}

                    placeholder="Search name, brand, SKU..."

                    className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-medium focus:outline-none ${inputBg}`}

                  />

                </div>



                {/* Filter buttons */}

                <div className="flex items-center gap-1.5">

                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Status:</span>

                  {[

                    { id: 'all', label: 'All Products' },

                    { id: 'active', label: 'Discounted / Live' },

                    { id: 'regular', label: 'Regular Price' }

                  ].map((tab) => (

                    <button

                      key={tab.id}

                      type="button"

                      onClick={() => setDiscountsFilter(tab.id as any)}

                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${

                        discountsFilter === tab.id

                          ? 'bg-slate-800 text-white border-transparent'

                          : 'border-slate-200 dark:border-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'

                      }`}

                    >

                      {tab.label}

                    </button>

                  ))}

                </div>

              </div>



              {/* Product Discount Table rendering */}

              {(() => {

                const dSearch = (discountsSearch || '').toLowerCase().trim();
                const filtered = products.filter((prod) => {

                  const matchesSearch = 
                    !dSearch ||
                    String(prod?.name || '').toLowerCase().includes(dSearch) ||
                    String(prod?.brand || '').toLowerCase().includes(dSearch) ||
                    String(prod?.category || '').toLowerCase().includes(dSearch) ||
                    String(prod?.sku || '').toLowerCase().includes(dSearch);



                  if (!matchesSearch) return false;



                  if (discountsFilter === 'active') {

                    const orig = prod.originalPrice || 0;

                    return prod.isOnOffer || (orig > prod.price);

                  } else if (discountsFilter === 'regular') {

                    const orig = prod.originalPrice || 0;

                    return !prod.isOnOffer && (orig <= prod.price);

                  }

                  return true;

                });



                if (filtered.length === 0) {

                  return (

                    <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-xs text-slate-400 font-medium">

                      No products match your active search filters

                    </div>

                  );

                }



                return (

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">

                    <table className="w-full text-left text-xs">

                      <thead className={`text-[10px] font-black uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 ${isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>

                        <tr>

                          <th className="p-3">Product Spec</th>

                          <th className="p-3">Category</th>

                          <th className="p-3">Selling Price</th>

                          <th className="p-3">Original Price</th>

                          <th className="p-3">Markdown %</th>

                          <th className="p-3">Storefront Offer</th>

                          <th className="p-3 text-right">Action</th>

                        </tr>

                      </thead>

                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">

                        {filtered.map((prod) => {

                          const orig = prod.originalPrice || 0;

                          const hasDisc = orig > prod.price;

                          const pct = hasDisc ? Math.round(((orig - prod.price) / orig) * 100) : 0;



                          return (

                            <tr key={prod.id} className="group hover:bg-blue-500/[0.035] transition-colors">

                              <td className="p-3">

                                <div className="flex items-center gap-2.5">

                                  <img

                                    src={prod.image}

                                    alt={prod.name}

                                    className="w-9 h-9 object-contain rounded-lg border bg-white p-0.5 shrink-0"

                                  />

                                  <div className="min-w-0">

                                    <span className={`font-bold block truncate max-w-[200px] ${textTitle}`}>

                                      {prod.name}

                                    </span>

                                    <span className="text-[9px] text-slate-400 font-mono">SKU: {prod.sku}</span>

                                  </div>

                                </div>

                              </td>



                              <td className="p-3">

                                <span className="bg-blue-500/10 text-blue-500 border border-blue-500/15 px-2 py-0.5 rounded-md font-bold text-[9px]">

                                  {prod.category}

                                </span>

                              </td>



                              <td className="p-3 font-bold text-blue-600 dark:text-blue-400 font-mono text-[13px]">

                                {formatTZS(prod.price)}

                              </td>



                              <td className="p-3 font-mono text-slate-400">

                                {orig > 0 ? (

                                  <span className="line-through">{formatTZS(orig)}</span>

                                ) : (

                                  <span className="italic text-[10px]">None</span>

                                )}

                              </td>



                              <td className="p-3">

                                {hasDisc ? (

                                  <span className="bg-rose-500 text-white font-extrabold px-2 py-0.5 rounded-full text-[10px] tracking-tight">

                                    -{pct}% OFF

                                  </span>

                                ) : (

                                  <span className="text-slate-400 text-[10px]">0%</span>

                                )}

                              </td>



                              <td className="p-3">

                                <button

                                  type="button"

                                  onClick={async () => {

                                    const newOfferState = !prod.isOnOffer;

                                    await updateProduct({

                                      ...prod,

                                      isOnOffer: newOfferState,

                                      offerTitle: newOfferState ? (prod.offerTitle || 'LIMITED TIME OFFER') : undefined

                                    });

                                  }}

                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 ${

                                    prod.isOnOffer

                                      ? 'bg-indigo-600 text-white font-black shadow-sm'

                                      : 'bg-slate-800 text-slate-400 hover:text-white'

                                  }`}

                                >

                                  <Zap className={`w-3 h-3 ${prod.isOnOffer ? 'fill-white' : ''}`} />

                                  <span>{prod.isOnOffer ? 'ON SALE' : 'Regular'}</span>

                                </button>

                              </td>



                              <td className="p-3 text-right">

                                <button

                                  type="button"

                                  onClick={() => handleOpenEditModal(prod)}

                                  className="px-2.5 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white font-bold text-xs transition-colors"

                                >

                                  Edit Discount

                                </button>

                              </td>

                            </tr>

                          );

                        })}

                      </tbody>

                    </table>

                  </div>

                );

              })()}

            </div>

          </div>
        )}

        {activeTab === 'visitor-analytics' && (
          <AdminVisitorAnalytics 
            products={products} 
            categories={categories}
            isDark={isDark}
          />
        )}

        {activeTab === 'audit-logs' && (
          <AdminAuditLogs theme={theme} />
        )}
          </motion.div>
        </AnimatePresence>
      {/* New Order Notification Alert */}
      <AnimatePresence>
        {newOrderAlert && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -20, transition: { duration: 0.2 } }}
            className={`fixed top-6 right-6 z-[9999] p-4 rounded-2xl shadow-2xl border flex items-start gap-4 max-w-sm ${isDark ? 'bg-slate-900 border-blue-500/30 shadow-blue-900/20' : 'bg-white border-blue-200 shadow-blue-500/10'}`}
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm mb-1">New Order Received!</h4>
              <p className={`text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {newOrderAlert.customerName} just placed an order for {newOrderAlert.items.reduce((a, c) => a + c.quantity, 0)} items.
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setActiveTab('orders');
                    setNewOrderAlert(null);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  View Order
                </button>
                <button 
                  onClick={() => setNewOrderAlert(null)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button onClick={() => setNewOrderAlert(null)} className={`absolute top-2 right-2 p-1 rounded-full ${isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'} cursor-pointer`}>
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
</main>



      {/* Footer System Status Bar */}

      <footer className={`shrink-0 border-t py-1 px-3 md:px-6 text-[9px] md:text-[11px] flex items-center justify-between gap-2 transition-colors z-30 shadow-sm ${

        isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'

      }`}>

        <div className="flex items-center gap-2 md:gap-3">

          <div className="flex items-center gap-1 font-medium whitespace-nowrap">

            <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">

              <Database className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-emerald-500" />

              <span className="text-emerald-500 uppercase font-black tracking-tighter">Active</span>

            </div>

          </div>

          

          <div className="flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-500 text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online Sync</span>
          </div>

        </div>



        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">

          <p className="hidden lg:block text-[10px] text-slate-500 font-medium truncate">

            Genuine Electronics Tanzania © {new Date().getFullYear()}

          </p>

          <div className={`flex items-center gap-1 md:gap-1.5 pl-2 border-l shrink-0 ${isDark ? 'border-slate-800' : 'border-slate-300'}`}>

            <span className="hidden sm:inline text-[9px] md:text-[10px] font-medium opacity-60 italic">Powered by</span>

            <a href="https://orbifinancial.com" target="_blank" rel="noopener noreferrer" className="flex items-center">

              <img 

                src={isDark ? "https://media-stock.orbifinancial.com/Orbi%20logo%20White.png" : "https://media-stock.orbifinancial.com/ORBI_LOGO_Blue.png"} 

                alt="Orbi" 

                className={isDark ? "h-3.5 md:h-4 w-auto opacity-70 hover:opacity-100 transition-opacity" : "h-3.5 md:h-4 w-auto opacity-80 hover:opacity-100 transition-opacity"} 

                referrerPolicy="no-referrer" 

              />

            </a>

          </div>

        </div>

      </footer>

    </div>



      

      {/* Category Modal */}

      

      

      {isCategoryReorderModalOpen && (

        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">

          <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border transition-all animate-in fade-in zoom-in-95 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>

            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>

              <div className="flex flex-col">

                <h2 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Reorder Categories</h2>

                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Drag and drop to rearrange how categories appear in the storefront.</p>

              </div>

              <button onClick={() => setIsCategoryReorderModalOpen(false)} className={`p-2 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>

                <X className="w-5 h-5" />

              </button>

            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2">

              {(() => {

                const sorted = [...(categories || [])].sort((a,b) => (a.sequence || 0) - (b.sequence || 0));

                return sorted.map((cat, index) => (

                  <div

                    key={cat.id}

                    draggable

                    onDragStart={(e) => {

                      setDraggedCatId(cat.id);

                      e.dataTransfer.effectAllowed = 'move';

                      e.currentTarget.classList.add('opacity-50');

                    }}

                    onDragEnd={(e) => {

                      setDraggedCatId(null);

                      e.currentTarget.classList.remove('opacity-50');

                    }}

                    onDragOver={(e) => {

                      e.preventDefault();

                      e.dataTransfer.dropEffect = 'move';

                    }}

                    onDrop={(e) => {

                      e.preventDefault();

                      if (draggedCatId && draggedCatId !== cat.id) {

                        const oldIndex = sorted.findIndex(c => c.id === draggedCatId);

                        const newIndex = sorted.findIndex(c => c.id === cat.id);

                        const newArr = [...sorted];

                        const [removed] = newArr.splice(oldIndex, 1);

                        newArr.splice(newIndex, 0, removed);

                        

                        newArr.forEach((c, idx) => {

                          if (c.sequence !== idx) {

                            if (updateCategory) updateCategory({ ...c, sequence: idx });

                          }

                        });

                      }

                      setDraggedCatId(null);

                    }}

                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-move transition-all ${isDark ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-slate-50 border-slate-200 hover:border-blue-500'}`}

                  >

                    <List className="w-4 h-4 text-slate-400 shrink-0" />

                    {cat.image ? (

                      <img src={cat.image} className="w-8 h-8 rounded-lg object-cover" />

                    ) : (

                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">

                        {cat.name.charAt(0)}

                      </div>

                    )}

                    <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-800'}`}>{cat.name}</span>

                  </div>

                ));

              })()}

            </div>

            <div className={`p-4 border-t flex justify-end ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>

              <button

                onClick={() => setIsCategoryReorderModalOpen(false)}

                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20"

              >

                Done

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Category Products Quick Preview & Management Modal */}
      <CategoryProductsPreviewModal
        isOpen={!!previewingCategory}
        onClose={() => setPreviewingCategory(null)}
        category={previewingCategory}
        categories={categories}
        onSelectCategory={(cat) => setPreviewingCategory(cat)}
        products={products || []}
        onUpdateProduct={updateProduct}
        onDeleteProduct={deleteProduct}
        onEditFullProduct={(prod) => {
          setPreviewingCategory(null);
          handleOpenEditModal(prod);
        }}
        onDuplicateProduct={(prod) => {
          setPreviewingCategory(null);
          handleDuplicateProduct(prod);
        }}
        onAddNewProductInCategory={(catName) => {
          setPreviewingCategory(null);
          handleOpenAddModal();
          setFormCategory(catName as any);
        }}
        isDark={isDark}
        showConfirm={showConfirm}
        showAlert={showAlert}
      />

      {isCategoryModalOpen && (

        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">

          <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border transition-all animate-in fade-in zoom-in-95 duration-200 ${cardBg}`}>

            {/* Modal Header */}

            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-100 bg-slate-50/80'}`}>

              <div className="flex items-center gap-3">

                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">

                  <FolderPlus className="w-6 h-6" />

                </div>

                <div>

                  <h2 className={`text-lg font-black tracking-tight ${textTitle}`}>

                    {editingCategory ? 'Edit Store Category' : 'Create New Category'}

                  </h2>

                  <p className={`text-xs mt-0.5 ${textSub}`}>

                    Configure custom imagery, bilingual titles, and catalog structure

                  </p>

                </div>

              </div>

              <button

                onClick={() => setIsCategoryModalOpen(false)}

                className={`p-2.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors ${textSub}`}

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            {/* Modal Body */}

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

              {/* Category Image Uploader Box */}

              <div className="space-y-2.5">

                <div className="flex items-center justify-between">

                  <label className={`text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${textTitle}`}>

                    <ImageIcon className="w-4 h-4 text-blue-500" />

                    <span>Category Visual Image</span>

                  </label>

                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">

                    Compressed & Uploaded

                  </span>

                </div>



                {/* Upload Mode Selector Pills */}

                <div className={`grid grid-cols-2 p-1 rounded-2xl border text-xs font-bold ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>

                  <button

                    type="button"

                    onClick={() => setCategoryImageInputMode('upload')}

                    className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${

                      categoryImageInputMode === 'upload'

                        ? isDark ? 'bg-slate-800 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm'

                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'

                    }`}

                  >

                    <UploadCloud className="w-4 h-4" />

                    <span>Upload Local Image from Device</span>

                  </button>

                  <button

                    type="button"

                    onClick={() => setCategoryImageInputMode('url')}

                    className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${

                      categoryImageInputMode === 'url'

                        ? isDark ? 'bg-slate-800 text-blue-400 shadow-sm' : 'bg-white text-blue-600 shadow-sm'

                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'

                    }`}

                  >

                    <Link className="w-4 h-4" />

                    <span>Image URL Link</span>

                  </button>

                </div>



                {/* Uploading Progress Overlay */}

                {isCategoryUploading ? (

                  <div className="relative rounded-2xl border-2 border-blue-500 bg-blue-50/80 dark:bg-blue-950/60 p-6 flex flex-col items-center justify-center text-center animate-pulse min-h-[140px] shadow-lg shadow-blue-500/10">

                    <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/30 mb-2">

                      <RefreshCw className="w-6 h-6 animate-spin" />

                    </div>

                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">Uploading Image...</span>

                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Compressed & Uploaded</span>

                  </div>

                ) : categoryForm.image ? (

                  /* Live Image Preview Canvas with Transparency Checkerboard */

                  <div className="relative rounded-2xl border bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:12px_12px] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] p-4 flex flex-col items-center justify-center min-h-[150px] group overflow-hidden dark:border-slate-800">

                    <img

                      src={categoryForm.image}

                      alt="Category Preview"

                      className="max-h-36 object-contain transition-transform duration-300 group-hover:scale-105"

                    />

                    

                    {/* Actions Overlay */}

                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3">

                      <label className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer shadow-lg flex items-center gap-1.5 transition-all">

                        <UploadCloud className="w-4 h-4" />

                        <span>Change File</span>

                        <input

                          type="file"

                          accept="image/*"

                          className="hidden"

                          onChange={async (e) => {

                            const file = e.target.files?.[0];

                            if (file) {

                              setIsCategoryUploading(true);

                              try {

                                const url = await processAndUploadImage(file, categoryForm.image);

                                setCategoryForm((prev) => ({ ...prev, image: url }));

                              } catch (err: any) {

                                console.error('Error uploading category image:', err);

                                alert(err.message || 'Error uploading image');

                              } finally {

                                setIsCategoryUploading(false);

                              }

                            }

                          }}

                        />

                      </label>

                      <button

                        type="button"

                        onClick={() => {

                          setCategoryForm((prev) => ({ ...prev, image: '' }));

                        }}

                        className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg flex items-center gap-1.5 transition-all"

                      >

                        <Trash2 className="w-4 h-4" />

                        <span>Remove</span>

                      </button>

                    </div>



                    <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[9px] font-mono px-2 py-0.5 rounded-md backdrop-blur-sm">

                      Uploaded

                    </div>

                  </div>

                ) : (

                  /* Dropzone or URL Input depending on active mode */

                  <div>

                    {categoryImageInputMode === 'upload' ? (

                      <label className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:border-blue-500 group ${

                        isDark ? 'border-slate-800 bg-slate-950/50 hover:bg-slate-900/80' : 'border-slate-200 bg-slate-50/60 hover:bg-blue-50/50'

                      }`}>

                        <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform">

                          <UploadCloud className="w-7 h-7" />

                        </div>

                        <span className={`text-xs font-bold ${textTitle}`}>

                          Upload Local Image from Device

                        </span>

                        <span className={`text-[10px] mt-1 ${textSub}`}>

                          Compressed & Uploaded

                        </span>

                        <input

                          type="file"

                          accept="image/*"

                          className="hidden"

                          disabled={isCategoryUploading}

                          onChange={async (e) => {

                            const file = e.target.files?.[0];

                            if (file) {

                              setIsCategoryUploading(true);

                              try {

                                const url = await processAndUploadImage(file, categoryForm.image);

                                setCategoryForm((prev) => ({ ...prev, image: url }));

                              } catch (err: any) {

                                console.error('Error uploading category image:', err);

                                alert(err.message || 'Error uploading image');

                              } finally {

                                setIsCategoryUploading(false);

                              }

                            }

                          }}

                        />

                      </label>

                    ) : (

                      <div className="relative">

                        <Link className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

                        <input

                          type="text"

                          value={categoryForm.image || ''}

                          onChange={(e) => setCategoryForm({ ...categoryForm, image: e.target.value })}

                          className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-xs font-mono ${inputBg}`}

                          placeholder="https://images.unsplash.com/... or storage URL"

                        />

                      </div>

                    )}

                  </div>

                )}

              </div>



              {/* Bilingual Category Names */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>

                  <label className={`block text-xs font-extrabold mb-1.5 flex items-center justify-between ${textTitle}`}>

                    <span>English Name</span>

                    <span className="text-[10px] font-bold text-slate-400">🇬🇧 Required</span>

                  </label>

                  <div className="relative">

                    <Type className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

                    <input

                      type="text"

                      value={categoryForm.name || ''}

                      onChange={(e) => {

                        const val = e.target.value;

                        const matchedSwahili = localSwahiliSuggestions[val];

                        setCategoryForm((prev) => ({

                          ...prev,

                          name: val,

                          swahiliName: prev.swahiliName ? prev.swahiliName : (matchedSwahili || '')

                        }));

                      }}

                      className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs font-bold ${inputBg}`}

                      placeholder="e.g. Air Conditioners & Cooling"

                    />

                  </div>

                </div>



                <div>

                  <label className={`block text-xs font-extrabold mb-1.5 flex items-center justify-between ${textTitle}`}>

                    <span>Swahili Name</span>

                    <span className="text-[10px] font-bold text-emerald-500">🇹🇿 Kiswahili</span>

                  </label>

                  <div className="relative">

                    <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />

                    <input

                      type="text"

                      value={categoryForm.swahiliName || ''}

                      onChange={(e) => setCategoryForm({ ...categoryForm, swahiliName: e.target.value })}

                      className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs font-bold ${inputBg}`}

                      placeholder="e.g. Makondishona na Vipoaji"

                    />

                  </div>

                  {/* Swahili Suggestion Chip if available */}

                  {categoryForm.name && localSwahiliSuggestions[categoryForm.name] && categoryForm.swahiliName !== localSwahiliSuggestions[categoryForm.name] && (

                    <button

                      type="button"

                      onClick={() => setCategoryForm({ ...categoryForm, swahiliName: localSwahiliSuggestions[categoryForm.name!] })}

                      className="mt-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"

                    >

                      <span>💡 Suggest Swahili:</span>

                      <span className="bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">

                        {localSwahiliSuggestions[categoryForm.name]}

                      </span>

                    </button>

                  )}

                </div>

              </div>



              {/* Description */}

              <div>

                <div className="flex items-center justify-between mb-1.5">

                  <label className={`text-xs font-extrabold ${textTitle}`}>Category Description</label>

                  <span className="text-[10px] text-slate-400 font-mono">

                    {(categoryForm.description || '').length}/250

                  </span>

                </div>

                <textarea

                  value={categoryForm.description || ''}

                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value.slice(0, 250) })}

                  className={`w-full px-4 py-3 rounded-2xl border text-xs h-20 resize-none ${inputBg}`}

                  placeholder="Describe what electronics, appliances or accessories belong in this category..."

                ></textarea>

              </div>



              {/* Storefront Chip Live Preview Box */}

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">

                  Customer Storefront Live Preview

                </span>

                <div className="flex items-center gap-3">

                  <div className="w-12 h-12 rounded-2xl border p-1 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-sm">

                    {categoryForm.image ? (

                      <img src={categoryForm.image} alt="Preview" className="w-full h-full object-contain" />

                    ) : (

                      <Tags className="w-5 h-5 text-slate-400" />

                    )}

                  </div>

                  <div>

                    <h4 className={`text-xs font-black ${textTitle}`}>{categoryForm.name || 'Category Name'}</h4>

                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">

                      <span>🇹🇿</span>

                      <span>{categoryForm.swahiliName || 'Jina la Kiswahili'}</span>

                    </span>

                  </div>

                </div>

              </div>

            </div>



            {/* Category Error Banner */}

            {categoryFormError && (

              <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-500 text-xs font-semibold">

                <AlertTriangle className="w-4 h-4 shrink-0" />

                <span className="flex-1">{categoryFormError}</span>

                <button

                  type="button"

                  onClick={() => setCategoryFormError(null)}

                  className="p-1 hover:bg-rose-500/20 rounded-lg text-rose-400"

                >

                  <X className="w-3.5 h-3.5" />

                </button>

              </div>

            )}



            {/* Modal Footer */}

            <div className={`p-6 border-t flex gap-3 ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>

              <button

                type="button"

                onClick={() => setIsCategoryModalOpen(false)}

                disabled={isSavingCategory}

                className={`flex-1 py-3 rounded-2xl font-bold text-xs transition-all disabled:opacity-50 ${

                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-700 border hover:bg-slate-100'

                }`}

              >

                Cancel

              </button>

              <button

                type="button"

                disabled={!categoryForm.name || isCategoryUploading || isSavingCategory}

                onClick={async () => {

                  if (!categoryForm.name) return;

                  setIsSavingCategory(true);

                  setCategoryFormError(null);

                  try {

                    if (editingCategory && updateCategory) {

                      const oldCategoryImage = editingCategory.image;

                      await updateCategory({ ...editingCategory, ...categoryForm } as CategoryItem);

                      if (oldCategoryImage && oldCategoryImage !== categoryForm.image) {
                        await deleteStorageImage(oldCategoryImage);
                      }

                    } else if (addCategory) {

                      await addCategory(categoryForm as Omit<CategoryItem, 'id'>);

                    }

                    setIsCategoryModalOpen(false);

                  } catch (err: any) {

                    console.error('Failed to save category:', err);

                    setCategoryFormError(err?.message || 'Failed to save category');

                  } finally {

                    setIsSavingCategory(false);

                  }

                }}

                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-2xl font-bold text-xs transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 disabled:opacity-50"

              >

                {isSavingCategory ? (

                  <>

                    <RefreshCw className="w-4 h-4 animate-spin" />

                    <span>Saving & Syncing...</span>

                  </>

                ) : (

                  <>

                    <Check className="w-4 h-4" />

                    <span>{editingCategory ? 'Save Changes' : 'Create Category'}</span>

                  </>

                )}

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Add / Edit Product Modal - Enterprise Product Creator */}

      {isProductModalOpen && (

        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center overflow-hidden animate-in fade-in">

          <div className={`w-full h-full flex flex-col overflow-hidden ${modalBg}`}>

            {/* Enterprise Header */}

            <div className={`p-4 sm:p-5 border-b flex flex-wrap items-center justify-between gap-4 shrink-0 ${isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50/90'}`}>

              <div className="flex items-center gap-3">

                <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/30">

                  <ShieldCheck className="w-6 h-6" />

                </div>

                <div>

                  <div className="flex items-center gap-2">

                    <h2 className={`text-base sm:text-lg font-black tracking-tight ${textTitle}`}>

                      {editingProduct ? 'Enterprise Product Specification Editor' : 'Add New Genuine Product'}

                    </h2>

                    <span className="bg-blue-600/10 text-blue-500 border border-blue-500/20 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full hidden sm:inline-block">

                      Enterprise Catalog Mode

                    </span>

                  </div>

                  <p className={`text-xs ${textSub}`}>

                    Configure general narrative overview & table-based technical specifications

                  </p>

                </div>

              </div>



              {/* Header Right Actions & Tab Switcher for Mobile */}

              <div className="flex items-center gap-2">

                <div className="flex items-center p-1 rounded-xl bg-slate-200/50 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700 text-xs font-bold md:hidden">

                  <button

                    type="button"

                    onClick={() => setActiveFormTab('editor')}

                    className={`px-3 py-1.5 rounded-lg transition-all ${activeFormTab === 'editor' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400'}`}

                  >

                    Form Editor

                  </button>

                  <button

                    type="button"

                    onClick={() => setActiveFormTab('preview')}

                    className={`px-3 py-1.5 rounded-lg transition-all ${activeFormTab === 'preview' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-400'}`}

                  >

                    Live Preview

                  </button>

                </div>



                <button

                  onClick={() => setIsProductModalOpen(false)}

                  className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}

                >

                  <X className="w-5 h-5" />

                </button>

              </div>

            </div>



            {/* Split Form Body - Independent Scroll and Compact UI arrangements */}

            <form id="enterprise-product-form" onSubmit={handleProductSubmit} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-5">

              {/* Responsive Grid System: Stacks on mobile, Side-by-side on desktop */}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">

                {/* Left Pane: Compact Product Form Inputs */}

                <div className={`md:col-span-7 lg:col-span-8 space-y-5 ${activeFormTab === 'preview' ? 'hidden md:block' : 'block'}`}>

                  {/* Section 1: Core Identification & Inventory */}

                  <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${isDark ? 'bg-slate-800/50 border-slate-700/80' : 'bg-slate-50 border-slate-200'}`}>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">

                    <h3 className={`text-xs font-black uppercase tracking-wider text-blue-500`}>1. Core Information & Inventory</h3>

                    <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1">

                      <CheckCircle className="w-3.5 h-3.5" /> Genuine Catalog Item

                    </span>

                  </div>



                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      <div>

                        <label className={`block text-xs font-bold mb-1 ${textSub}`}>Product Name *</label>

                        <input

                          type="text"

                          required

                          value={formName}

                          onChange={(e) => handleProductNameChangeWithBrandDetection(e.target.value)}

                          placeholder="e.g. LG Dual Inverter Air Conditioner 1.5 Ton"

                          className={`w-full rounded-xl px-3.5 py-2 text-sm font-semibold ${inputBg}`}

                        />

                      </div>

                      <div>

                        <div className="flex items-center justify-between mb-1">
                          <label className={`block text-xs font-bold ${textSub}`}>Brand *</label>
                          {formBrand && (
                            <button
                              type="button"
                              onClick={() => setFormBrand('')}
                              className="text-[10px] text-blue-500 hover:underline font-semibold"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <input

                            type="text"

                            required

                            list="admin-portal-brands-datalist"

                            value={formBrand}

                            onChange={(e) => setFormBrand(e.target.value)}

                            placeholder="e.g. LG, Samsung, Sony, Apple"

                            className={`w-full rounded-xl px-3.5 py-2 text-sm font-semibold ${inputBg}`}

                          />

                          {/* HTML5 Datalist for automatic browser autocomplete suggestions from existing inventory */}
                          <datalist id="admin-portal-brands-datalist">
                            {existingBrands.map((b) => (
                              <option key={b} value={b} />
                            ))}
                          </datalist>
                        </div>

                        {/* Quick Brand Select Chips */}
                        <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-slate-400 font-semibold mr-1">Quick Select:</span>
                          {existingBrands.slice(0, 7).map((b) => {
                            const isSelected = (formBrand || '').toLowerCase().trim() === (b || '').toLowerCase().trim();
                            return (
                              <button
                                key={b}
                                type="button"
                                onClick={() => setFormBrand(b)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all border ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : isDark
                                    ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                                }`}
                              >
                                {b}
                              </button>
                            );
                          })}
                        </div>

                      </div>

                    </div>



                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      <div>

                        <label className={`block text-xs font-bold mb-1 ${textSub}`}>Category *</label>

                        <select

                          value={formCategory}

                          onChange={(e) => {

                            const cat = e.target.value as Category;

                            setFormCategory(cat);

                          }}

                          className={`w-full rounded-xl px-3.5 py-2 text-sm font-semibold ${inputBg}`}

                        >

                          {categories.map((cat) => (

                            <option key={cat.id} value={cat.name}>

                              {cat.name}

                            </option>

                          ))}

                        </select>

                      </div>



                      <div>

                        <label className={`block text-xs font-bold mb-1 ${textSub}`}>Warranty Statement *</label>

                        <input

                          type="text"

                          required

                          value={formWarranty}

                          onChange={(e) => setFormWarranty(e.target.value)}

                          placeholder="e.g. 2 Years Official Genuine Manufacturer Warranty"

                          className={`w-full rounded-xl px-3.5 py-2 text-sm font-semibold ${inputBg}`}

                        />

                      </div>

                    </div>



                    {/* Financials & Stock Row */}

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">

                      <div>

                        <label className={`block text-xs font-bold mb-1 ${textSub}`}>Selling Price (TZS) *</label>

                        <input

                          type="text"

                          inputMode="numeric"

                          required

                          value={formPrice === 0 ? '' : formPrice}

                          onFocus={(e) => e.target.select()}

                          onChange={(e) => {

                            const val = e.target.value.replace(/[^0-9]/g, '');

                            setFormPrice(val === '' ? 0 : parseInt(val));

                          }}

                          placeholder="0"

                          className={`w-full rounded-xl px-3.5 py-2 text-sm font-extrabold text-blue-600 dark:text-blue-400 ${inputBg}`}

                        />

                      </div>

                      <div>

                        <label className={`block text-xs font-bold mb-1 ${textSub}`}>

                          Original Regular Price (TZS)

                        </label>

                        <input

                          type="text"

                          inputMode="numeric"

                          value={formOriginalPrice === 0 ? '' : formOriginalPrice}

                          onFocus={(e) => e.target.select()}

                          onChange={(e) => {

                            const val = e.target.value.replace(/[^0-9]/g, '');

                            setFormOriginalPrice(val === '' ? 0 : parseInt(val));

                          }}

                          placeholder="Optional"

                          className={`w-full rounded-xl px-3.5 py-2 text-sm font-semibold ${inputBg}`}

                        />

                      </div>

                      <div>

                        <label className={`block text-xs font-bold mb-1 ${textSub}`}>Cost Price (TZS)</label>

                        <input

                          type="text"

                          inputMode="numeric"

                          required

                          value={formCostPrice === 0 ? '' : formCostPrice}

                          onFocus={(e) => e.target.select()}

                          onChange={(e) => {

                            const val = e.target.value.replace(/[^0-9]/g, '');

                            setFormCostPrice(val === '' ? 0 : parseInt(val));

                          }}

                          placeholder="0"

                          className={`w-full rounded-xl px-3.5 py-2 text-sm font-bold ${inputBg}`}

                        />

                      </div>

                      <div>

                        <label className={`block text-xs font-bold mb-1 ${textSub}`}>Wholesale Price (TZS)</label>

                        <input

                          type="text"

                          inputMode="numeric"

                          value={formWholesalePrice === 0 ? '' : formWholesalePrice}

                          onFocus={(e) => e.target.select()}

                          onChange={(e) => {

                            const val = e.target.value.replace(/[^0-9]/g, '');

                            setFormWholesalePrice(val === '' ? 0 : parseInt(val));

                          }}

                          placeholder="Optional"

                          className={`w-full rounded-xl px-3.5 py-2 text-sm font-bold ${inputBg}`}

                        />

                      </div>

                      <div>

                        <label className={`block text-xs font-bold mb-1 ${textSub}`}>Stock Quantity *</label>

                        <input

                          type="text"

                          inputMode="numeric"

                          required

                          value={formStock === 0 ? '' : formStock}

                          onFocus={(e) => e.target.select()}

                          onChange={(e) => {

                            const val = e.target.value.replace(/[^0-9]/g, '');

                            setFormStock(val === '' ? 0 : parseInt(val));

                          }}

                          placeholder="0"

                          className={`w-full rounded-xl px-3.5 py-2 text-sm font-bold ${inputBg}`}

                        />

                      </div>

                    </div>



                    {/* TRA VAT Configuration Box */}

                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">

                      <label className="flex items-center gap-2.5 cursor-pointer">

                        <input

                          type="checkbox"

                          checked={formIsVatInclusive}

                          onChange={(e) => setFormIsVatInclusive(e.target.checked)}

                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"

                        />

                        <div>

                          <span className={`text-xs font-black ${textTitle}`}>

                            Product Subject to TRA VAT ({settingsForm.vatPercentage ?? 18}%)

                          </span>

                          <p className="text-[10px] text-slate-500">

                            {formIsVatInclusive 

                              ? `Price includes ${settingsForm.vatPercentage ?? 18}% VAT. Tax is itemized transparently.`

                              : `Non-VAT / Tax Exempt item. No VAT will be charged on this product.`}

                          </p>

                        </div>

                      </label>

                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md shrink-0 ${formIsVatInclusive ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'}`}>

                        {formIsVatInclusive ? 'VAT Subject' : 'Non-VAT / Exempt'}

                      </span>

                    </div>



                    {/* Discount & Offer Campaign Panel */}

                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-3">

                      <div className="flex flex-wrap items-center justify-between gap-2">

                        <div className="flex items-center gap-2">

                          <Zap className="w-4 h-4 text-indigo-500 shrink-0" />

                          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">

                            Discount & Limited Time Offer Campaign Settings

                          </span>

                        </div>

                        {formOriginalPrice > formPrice && (

                          <span className="text-xs font-black bg-rose-600 text-white px-2.5 py-0.5 rounded-full shadow-sm">

                            -{Math.round(((formOriginalPrice - formPrice) / formOriginalPrice) * 100)}% DISCOUNT ACTIVE

                          </span>

                        )}

                      </div>



                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">

                        <div className="flex items-center gap-2 sm:col-span-1 pt-4">

                          <label className="flex items-center gap-2.5 cursor-pointer">

                            <input

                              type="checkbox"

                              checked={formIsOnOffer}

                              onChange={(e) => setFormIsOnOffer(e.target.checked)}

                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"

                            />

                            <span className={`text-xs font-extrabold ${textTitle}`}>

                              Enable Limited Time Offer Badge

                            </span>

                          </label>

                        </div>



                        <div>

                          <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Offer Title Badge</label>

                          <input

                            type="text"

                            value={formOfferTitle}

                            onChange={(e) => setFormOfferTitle(e.target.value)}

                            placeholder="e.g. HOT DEAL, FLASH SALE"

                            className={`w-full rounded-xl px-3 py-1.5 text-xs font-semibold ${inputBg}`}

                          />

                        </div>



                        <div>

                          <label className={`block text-[11px] font-bold mb-1 ${textSub}`}>Offer Expiration Date & Time</label>

                          <input

                            type="datetime-local"

                            value={formOfferEndsAt ? formOfferEndsAt.slice(0, 16) : ''}

                            onChange={(e) => setFormOfferEndsAt(e.target.value ? new Date(e.target.value).toISOString() : '')}

                            className={`w-full rounded-xl px-3 py-1.5 text-xs font-semibold ${inputBg}`}

                          />

                        </div>

                      </div>

                    </div>



                    {/* Gross Profit Margin Indicator */}

                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 flex items-center justify-between text-xs">

                      <span className="font-semibold text-blue-700 dark:text-blue-300">Unit Financial Projection:</span>

                      <span className="font-extrabold text-slate-900 dark:text-white">

                        Profit: <span className="text-emerald-600 dark:text-emerald-400">{formatTZS(Math.max(0, formPrice - formCostPrice))}</span>

                        <span className="ml-2 text-[10px] text-slate-500 font-mono">

                          ({formPrice > 0 ? Math.round(((formPrice - formCostPrice) / formPrice) * 100) : 0}% Margin)

                        </span>

                      </span>

                    </div>



                    {/* SKU, Barcode, Image */}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                      <div>

                        <div className="flex items-center justify-between mb-1">

                          <label className={`text-xs font-bold ${textSub}`}>SKU Number</label>

                          <button

                            type="button"

                            onClick={() => setFormSku(`GE-SKU-${Math.floor(Math.random() * 90000 + 10000)}`)}

                            className="text-[10px] font-bold text-blue-500 hover:underline"

                          >

                            Auto-Generate

                          </button>

                        </div>

                        <input

                          type="text"

                          required

                          value={formSku}

                          onChange={(e) => setFormSku(e.target.value)}

                          className={`w-full rounded-xl px-3.5 py-2 text-sm font-mono ${inputBg}`}

                        />

                      </div>



                      <div>

                        <div className="flex items-center justify-between mb-1">

                          <label className={`text-xs font-bold ${textSub}`}>EAN / Barcode</label>

                          <button

                            type="button"

                            onClick={() => setFormBarcode(`${Math.floor(Math.random() * 900000000000 + 100000000000)}`)}

                            className="text-[10px] font-bold text-blue-500 hover:underline"

                          >

                            Auto-Generate

                          </button>

                        </div>

                        <input

                          type="text"

                          required

                          value={formBarcode}

                          onChange={(e) => setFormBarcode(e.target.value)}

                          className={`w-full rounded-xl px-3.5 py-2 text-sm font-mono ${inputBg}`}

                        />

                      </div>

                    </div>



                    {/* Section 1.5: Product Visuals & Multi-Angle Media Management */}

                    <div className="space-y-4 pt-2">

                      {/* Image Swap / Bulk Upload Toast Notification */}

                      {imageSwapFeedback && (

                        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-between text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200">

                          <div className="flex items-center gap-2">

                            <Sparkles className="w-4 h-4 text-emerald-500" />

                            <span>{imageSwapFeedback}</span>

                          </div>

                          <button

                            type="button"

                            onClick={() => setImageSwapFeedback(null)}

                            className="p-1 hover:bg-emerald-500/20 rounded-lg"

                          >

                            <X className="w-3.5 h-3.5" />

                          </button>

                        </div>

                      )}



                      <DndContext

                        sensors={sensors}

                        collisionDetection={closestCenter}

                        onDragStart={handleDragStart}

                        onDragEnd={handleDragEnd}

                      >

                        {/* 1. Primary Front Cover Droppable Container */}

                        <div>

                          <HeroImageDropzone

                            formImage={formImage}

                            activeDragImage={activeDragImage}

                            isUploading={isUploading}

                            onImageChange={(url) => setFormImage(url)}

                            onFileUpload={handleImageUpload}

                            onSwapWithFirstGallery={handleSwapWithFirstGallery}

                            hasGalleryImages={formImages.length > 0}

                            isDark={isDark}

                            inputBg={inputBg}

                            textSub={textSub}

                            onPreview={(url) => setPreviewLightboxImage(url)}

                          />

                        </div>



                        {/* 2. Product Gallery & Bulk Image Toolset */}

                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">

                          <div className="flex flex-wrap items-center justify-between gap-2">

                            <div>

                              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-500">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/15">
                                  <ImageIcon className="h-4 w-4" />
                                </div>
                                <div>
                                  <div>Product Gallery</div>
                                  <div className="mt-0.5 text-[10px] font-semibold normal-case tracking-normal text-slate-400">{formImages.length} additional angles</div>
                                </div>
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium">
                                Reorder by dragging. Drop a gallery image on the cover stage to promote it.
                              </p>

                            </div>



                            {/* Multi-Tool Actions Bar */}

                            <div className="flex flex-wrap items-center gap-2">

                              {/* Bulk File Selector */}

                              <label className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase cursor-pointer transition-all border flex items-center gap-1.5 shadow-sm ${

                                isDark 

                                  ? 'bg-blue-600/15 border-blue-500/30 text-blue-400 hover:bg-blue-600/25' 

                                  : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'

                              }`}>

                                <ImagePlus className="w-3.5 h-3.5" />

                                <span>{isMultiUploading ? 'Uploading...' : 'Bulk Upload Files'}</span>

                                <input

                                  type="file"

                                  multiple

                                  accept="image/*"

                                  className="hidden"

                                  onChange={handleMultiImageUpload}

                                  disabled={isMultiUploading}

                                />

                              </label>



                              {/* Paste Bulk URLs Modal Toggle */}

                              <button

                                type="button"

                                onClick={() => setIsBulkUrlModalOpen(!isBulkUrlModalOpen)}

                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all border flex items-center gap-1.5 ${

                                  isBulkUrlModalOpen

                                    ? 'bg-purple-600 text-white border-purple-600'

                                    : isDark 

                                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 

                                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'

                                }`}

                                

                              >

                                <Link className="w-3.5 h-3.5" />

                                <span>Paste URLs</span>

                              </button>



                              {/* Quick Category Multi-Pack Presets */}

                              <button

                                type="button"

                                onClick={() => {

                                  const sampleAngles = [

                                    'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=800',

                                    'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&q=80&w=800',

                                    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800'

                                  ];

                                  setFormImages(prev => Array.from(new Set([...prev, ...sampleAngles])));

                                  setImageSwapFeedback('Imported curated multi-angle product studio pack!');

                                  setTimeout(() => setImageSwapFeedback(null), 3000);

                                }}

                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all border flex items-center gap-1.5 ${

                                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'

                                }`}

                                

                              >

                                <Layers className="w-3.5 h-3.5" />

                                <span>Sample Studio Angles</span>

                              </button>



                              {/* Clear All */}

                              {formImages.length > 0 && (

                                <button

                                  type="button"

                                  onClick={() => {

                                    if (window.confirm('Remove all gallery images? The main front image will be preserved.')) {

                                      setFormImages([]);

                                    }

                                  }}

                                  className="px-2 py-1.5 rounded-xl text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 transition-all"

                                  

                                >

                                  Clear All

                                </button>

                              )}

                            </div>

                          </div>



                          {/* Bulk URLs Input Drawer */}

                          {isBulkUrlModalOpen && (

                            <div className={`p-4 rounded-2xl border space-y-2.5 animate-in fade-in duration-200 ${

                              isDark ? 'bg-slate-900 border-slate-700' : 'bg-purple-50/50 border-purple-200'

                            }`}>

                              <div className="flex items-center justify-between">

                                <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1.5">

                                  <Link className="w-3.5 h-3.5" />

                                  Paste Multiple Image URLs (Batch Import)

                                </span>

                                <button

                                  type="button"

                                  onClick={() => setIsBulkUrlModalOpen(false)}

                                  className="p-1 text-slate-400 hover:text-slate-600"

                                >

                                  <X className="w-3.5 h-3.5" />

                                </button>

                              </div>

                              <textarea

                                rows={3}

                                value={bulkUrlInput}

                                onChange={(e) => setBulkUrlInput(e.target.value)}

                                placeholder="Paste image URLs separated by newlines, commas, or spaces:&#10;https://example.com/side-angle.jpg&#10;https://example.com/back-angle.jpg&#10;https://example.com/detail-zoom.jpg"

                                className={`w-full rounded-xl p-3 text-xs font-mono resize-none ${inputBg}`}

                              />

                              <div className="flex items-center justify-between pt-1">

                                <span className="text-[10px] text-slate-500 italic">

                                  Supports direct WebP, PNG, JPEG, SVG, and Unsplash URLs.

                                </span>

                                <button

                                  type="button"

                                  onClick={handleProcessBulkUrls}

                                  disabled={!bulkUrlInput.trim()}

                                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all"

                                >

                                  Add to Gallery

                                </button>

                              </div>

                            </div>

                          )}



                          {/* Batch Upload Progress Indicator */}

                          {bulkUploadProgress && (

                            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 space-y-2 animate-in fade-in duration-200">

                              <div className="flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">

                                <div className="flex items-center gap-2">

                                  <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />

                                  <span>

                                    Uploading Image {bulkUploadProgress.current} of {bulkUploadProgress.total}

                                  </span>

                                </div>

                                <span className="text-[11px] font-mono opacity-80 truncate max-w-[200px]">

                                  {bulkUploadProgress.filename}

                                </span>

                              </div>

                              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">

                                <div

                                  className="bg-blue-600 h-full rounded-full transition-all duration-300"

                                  style={{

                                    width: `${Math.round((bulkUploadProgress.current / bulkUploadProgress.total) * 100)}%`,

                                  }}

                                />

                              </div>

                            </div>

                          )}



                          {/* Interactive Sortable Gallery Grid & Desktop Drag Area */}

                          <div
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.dataset.dragging = 'true';
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.dataset.dragging = 'false';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              e.currentTarget.dataset.dragging = 'false';
                              const files = e.dataTransfer.files;
                              if (files && files.length > 0) handleBulkFilesUpload(files);
                            }}
                            className={`group/gallery relative rounded-[1.5rem] border-2 border-dashed p-3 transition-all duration-200 ${
                              isDark ? 'border-slate-800 bg-slate-900/30' : 'border-slate-200 bg-slate-50/50'
                            } data-[dragging=true]:border-blue-500 data-[dragging=true]:bg-blue-500/5 data-[dragging=true]:ring-4 data-[dragging=true]:ring-blue-500/10`}
                          >
                            <div className="pointer-events-none absolute inset-2 rounded-[1.1rem] border border-blue-500/0 transition-all duration-200 group-data-[dragging=true]/gallery:border-blue-500/30" />

                            <SortableContext items={formImages} strategy={rectSortingStrategy}>

                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">

                                {formImages.map((img, idx) => (
                                  <SortableImageItem
                                    key={img}
                                    id={img}
                                    img={img}
                                    idx={idx}
                                    totalImages={formImages.length}
                                    onRemove={handleRemoveImage}
                                    onSetAsMain={handleSetAsMain}
                                    onPreview={(url) => setPreviewLightboxImage(url)}
                                    isDark={isDark}
                                  />
                                ))}



                                {isMultiUploading && !bulkUploadProgress && (

                                  <div className="aspect-square rounded-2xl border-2 border-dashed border-blue-500/40 flex flex-col items-center justify-center bg-blue-500/5 text-blue-500 p-2 text-center">

                                    <RefreshCw className="w-6 h-6 animate-spin mb-1 text-blue-500" />

                                    <span className="text-xs font-bold">Uploading...</span>

                                  </div>

                                )}



                                {formImages.length === 0 && !isMultiUploading && (

                                  <div className="col-span-full py-10 rounded-2xl flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800">

                                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-500 shadow-inner">
                                      <UploadCloud className="h-6 w-6" />
                                    </div>
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                      Drop product images here
                                    </span>
                                    <p className="mt-1 max-w-md px-4 text-center text-[11px] font-medium text-slate-500">
                                      Multiple files are supported. Drag existing images to reorder them.
                                    </p>

                                  </div>

                                )}

                              </div>

                            </SortableContext>

                          </div>

                        </div>



                        {/* Floating Drag Overlay */}

                        <DragOverlay zIndex={9999}>

                          {activeDragImage ? (

                            <div className="w-32 h-32 rounded-2xl border-2 border-amber-500 bg-slate-900 p-2 shadow-2xl ring-4 ring-amber-500/40 transform rotate-3 flex flex-col items-center justify-center pointer-events-none relative">

                              <img

                                src={activeDragImage}

                                alt="Dragging preview"

                                className="w-full h-full object-contain rounded-xl"

                              />

                              <div className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-amber-200 bg-amber-400 text-slate-950 shadow-lg">
                                <Move className="h-3.5 w-3.5" />
                              </div>

                            </div>

                          ) : null}

                        </DragOverlay>

                      </DndContext>

                    </div>



                    {/* Lightbox Modal for Gallery Image Preview */}

                    {previewLightboxImage && (

                      <div 

                        className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"

                        onClick={() => setPreviewLightboxImage(null)}

                      >

                        <div 

                          className="relative max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-2xl flex flex-col items-center justify-center overflow-hidden"

                          onClick={(e) => e.stopPropagation()}

                        >

                          <div className="w-full flex items-center justify-between pb-2 px-2 border-b border-slate-800 text-white">

                            <span className="text-xs font-bold tracking-wide">Image Preview (Full Resolution)</span>

                            <div className="flex items-center gap-2">

                              <button

                                type="button"

                                onClick={() => {

                                  setFormImage(previewLightboxImage);

                                  setPreviewLightboxImage(null);

                                  setImageSwapFeedback('Set previewed image as Main Front Cover!');

                                  setTimeout(() => setImageSwapFeedback(null), 3000);

                                }}

                                className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow transition-all"

                              >

                                <Star className="w-3 h-3 fill-slate-950" />

                                <span>Set as Main Cover</span>

                              </button>

                              <button

                                type="button"

                                onClick={() => setPreviewLightboxImage(null)}

                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-all"

                              >

                                <X className="w-4 h-4" />

                              </button>

                            </div>

                          </div>

                          <div className="p-4 flex items-center justify-center max-h-[70vh]">

                            <img

                              src={previewLightboxImage}

                              alt="Full preview"

                              className="max-h-[65vh] max-w-full object-contain rounded-2xl shadow-lg"

                            />

                          </div>

                        </div>

                      </div>

                    )}



                  </div>



                  {/* Section 2: Product Description (Table or Formatted Editor) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1">
                      <h3 className={`text-xs font-black uppercase tracking-wider text-blue-500`}>2. Product Description & Specifications</h3>
                      <span className="text-[11px] text-slate-400">Choose Table or Rich Format</span>
                    </div>

                    <ProductDescriptionEditor
                      value={formDescription}
                      onChange={setFormDescription}
                      isDark={isDark}
                      category={formCategory}
                    />
                  </div>

 

                  {/* Section 3: Advanced Table-Based Features & Specifications Editor */}

                  <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${isDark ? 'bg-slate-800/50 border-slate-700/80' : 'bg-slate-50 border-slate-200'}`}>

                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">

                      <div>

                        <h3 className={`text-xs font-black uppercase tracking-wider text-blue-500`}>3. Table-Based Technical Specifications & Features</h3>

                        <p className={`text-[11px] ${textSub}`}>Key-value pairs for advanced filtering, side-by-side comparison & spec sheet preview</p>

                      </div>



                      <button

                        type="button"

                        onClick={() => handleLoadCategoryPreset(formCategory)}

                        className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"

                      >

                        <Zap className="w-3.5 h-3.5 text-blue-500" />

                        <span>Load Category Presets</span>

                      </button>

                    </div>



                    {/* Preset Category Bar */}

                    <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold text-slate-500">

                      <span className="self-center mr-1">Quick Presets:</span>

                      {['Air Conditioners & Cooling', 'Refrigeration & Freezers', 'Kitchen Cooking & Ovens', 'Home Cleaning & Laundry', 'Computers & Tablets', 'Phones & Wearables', 'Audio & Headphones'].map((cat) => (

                        <button

                          key={cat}

                          type="button"

                          onClick={() => handleLoadCategoryPreset(cat)}

                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500 text-slate-700 dark:text-slate-300 text-[10px] font-bold transition-all"

                        >

                          {cat.split(' ')[0]}

                        </button>

                      ))}

                    </div>



                    {/* Table Specification Rows Editor */}
                    <div className="space-y-3 pt-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold uppercase text-slate-400">Quick Add:</span>
                          {[
                            'Power',
                            'Voltage',
                            'Capacity',
                            'Inverter Tech',
                            'Energy Rating',
                            'Dimensions',
                            'Warranty',
                            'Material',
                            'Connectivity',
                            'Noise Level',
                            'Weight'
                          ].map((attr) => (
                            <button
                              key={attr}
                              type="button"
                              onClick={() => handleAddPresetSpec(attr, '')}
                              className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 text-[10px] font-bold transition-colors"
                              title={`Add ${attr} specification field`}
                            >
                              + {attr}
                            </button>
                          ))}
                        </div>

                        {formSpecs.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setFormSpecs([])}
                            className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline transition-colors"
                          >
                            Clear All ({formSpecs.length})
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase text-slate-400 px-1 items-center">
                        <div className="col-span-4 sm:col-span-4">Feature / Parameter</div>
                        <div className="col-span-5 sm:col-span-5">Value / Technical Spec (e.g. 100W, 220V, 5-Star)</div>
                        <div className="col-span-3 sm:col-span-3 text-right">Actions & Order</div>
                      </div>

                      {formSpecs.map((spec, index) => (
                        <div key={spec.id || index} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border transition-all ${isDark ? 'bg-slate-900/60 border-slate-700/60 hover:border-slate-600' : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'}`}>
                          <div className="col-span-4 sm:col-span-4">
                            <input
                              type="text"
                              required
                              value={spec.key}
                              onChange={(e) => {
                                const newKey = e.target.value;
                                setFormSpecs((prev) => prev.map((item, i) => i === index ? { ...item, key: newKey } : item));
                              }}
                              placeholder="e.g. Power / Wattage"
                              className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-semibold ${inputBg}`}
                            />
                          </div>

                          <div className="col-span-5 sm:col-span-5">
                            <input
                              type="text"
                              required
                              value={spec.value}
                              onChange={(e) => {
                                const newVal = e.target.value;
                                setFormSpecs((prev) => prev.map((item, i) => i === index ? { ...item, value: newVal } : item));
                              }}
                              placeholder="e.g. 100W or 220V - 240V"
                              className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-bold ${inputBg}`}
                            />
                          </div>

                          <div className="col-span-3 sm:col-span-3 flex items-center justify-end gap-1">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveSpecUp(index)}
                              className={`p-1.5 rounded-lg border text-slate-500 transition-colors ${index === 0 ? 'opacity-30 cursor-not-allowed border-transparent' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                              title="Move Row Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={index === formSpecs.length - 1}
                              onClick={() => handleMoveSpecDown(index)}
                              className={`p-1.5 rounded-lg border text-slate-500 transition-colors ${index === formSpecs.length - 1 ? 'opacity-30 cursor-not-allowed border-transparent' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                              title="Move Row Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicateSpec(index)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-colors"
                              title="Duplicate this row"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setFormSpecs((prev) => prev.filter((_, i) => i !== index));
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Delete specification row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          setFormSpecs((prev) => [...prev, { id: `spec-custom-${Date.now()}`, key: '', value: '' }]);
                        }}
                        className="w-full py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all mt-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Custom Technical Specification Row</span>
                      </button>
                    </div>

                  </div>

                </div>



                {/* Right Pane: Live Customer Storefront Preview Card */}

                <div className={`md:col-span-5 lg:col-span-4 md:sticky md:top-0 space-y-4 ${activeFormTab === 'editor' ? 'hidden md:block' : 'block'}`}>

                  <div className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${isDark ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-xl'} max-w-sm mx-auto w-full`}>

                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">

                    <div className="flex items-center gap-2">

                      <Eye className="w-4 h-4 text-blue-500" />

                      <h3 className={`text-xs font-black uppercase tracking-wider ${textTitle}`}>

                        Live Customer Storefront Preview

                      </h3>

                    </div>

                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">

                      Real-Time Sync

                    </span>

                  </div>

 

                    {/* Rendered Product Card Header */}

                    <div className="rounded-2xl border p-4 space-y-3 bg-slate-50/50 dark:bg-slate-800/40 dark:border-slate-700">

                      <div className="relative flex flex-col items-center bg-white p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 max-w-[280px] mx-auto w-full">

                        {formImage ? (
                          <img
                            src={formImage}
                            alt="Product Preview"
                            className="h-32 object-contain"
                          />
                        ) : (
                          <div className="h-32 flex items-center justify-center text-xs text-slate-400">No Image Selected</div>
                        )}

                        {formImages.length > 0 && (

                          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 w-full max-w-full no-scrollbar">

                            <div className="w-10 h-10 rounded-lg border-2 border-blue-500 p-0.5 shrink-0">

                              <img src={formImage} alt="Main" className="w-full h-full object-contain" />

                            </div>

                            {formImages.map((img, i) => (

                              <div key={i} className="w-10 h-10 rounded-lg border border-slate-200 p-0.5 shrink-0 opacity-60">

                                <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-contain" />

                              </div>

                            ))}

                          </div>

                        )}

                        <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1">

                          <ShieldCheck className="w-3 h-3" />

                          <span>Genuine Verified</span>

                        </div>

                      </div>



                      <div>

                        <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">

                          {formBrand || 'GENUINE BRAND'} • {formCategory}

                        </span>

                        <h4 className={`text-sm font-extrabold leading-snug mt-0.5 ${textTitle}`}>

                          {formName || 'New Genuine Product Title'}

                        </h4>

                        <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">

                          {formatTZS(formPrice)}

                        </div>

                      </div>

                    </div>



                    {/* General Narrative Description Preview */}

                    <div className="space-y-1.5">

                      <h5 className={`text-xs font-bold text-slate-500 uppercase tracking-wider`}>Description & Specifications Preview</h5>
                      <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
                        <ProductDescriptionView description={formDescription} />
                      </div>

                    </div>



                    {/* Formatted Table-Based Specifications Preview */}

                    <div className="space-y-2">

                      <div className="flex items-center justify-between">

                        <h5 className={`text-xs font-bold text-slate-500 uppercase tracking-wider`}>Table-Based Specifications</h5>

                        <span className="text-[10px] text-blue-500 font-mono font-bold">{formSpecs.filter(s => s.key && s.value).length} Specs</span>

                      </div>



                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden text-xs">

                        <table className="w-full text-left">

                          <thead className={`text-[10px] font-black uppercase ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>

                            <tr>

                              <th className="p-2.5">Feature / Spec</th>

                              <th className="p-2.5 text-right">Details</th>

                            </tr>

                          </thead>

                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">

                            {formSpecs.filter(s => s.key && s.value).length > 0 ? (

                              formSpecs.filter(s => s.key && s.value).map((spec, idx) => (

                                <tr key={idx} className={idx % 2 === 0 ? (isDark ? 'bg-slate-900/60' : 'bg-white') : (isDark ? 'bg-slate-800/30' : 'bg-slate-50/70')}>

                                  <td className="p-2.5 font-semibold text-slate-600 dark:text-slate-400">{spec.key}</td>

                                  <td className="p-2.5 font-extrabold text-slate-900 dark:text-white text-right">{spec.value}</td>

                                </tr>

                              ))

                            ) : (

                              <tr>

                                <td colSpan={2} className="p-4 text-center text-slate-400 italic">No table specifications added yet</td>

                              </tr>

                            )}

                          </tbody>

                        </table>

                      </div>

                    </div>



                    {/* Live Unique QR & Barcode Label */}

                    {formSku && (

                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">

                        <div className="p-1.5 bg-white rounded-lg shadow-sm shrink-0">

                          <QRCodeSVG

                            value={JSON.stringify({ sku: formSku, barcode: formBarcode, name: formName, price: formPrice })}

                            size={48}

                            level="M"

                          />

                        </div>

                        <div className="flex-1 text-[11px] font-mono">

                          <span className="text-[9px] uppercase text-slate-400 block font-sans">Inventory Tag SKU</span>

                          <span className="font-bold text-blue-500">{formSku}</span>

                          <span className="text-[10px] text-slate-500 block font-sans">EAN: {formBarcode}</span>

                        </div>

                      </div>

                    )}

                  </div>

                </div>

              </div>

            </form>



            {/* Product Error Banner */}

            {productFormError && (

              <div className="mx-4 sm:mx-6 mt-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-500 text-xs font-semibold animate-shake">

                <AlertTriangle className="w-4 h-4 shrink-0" />

                <span className="flex-1">{productFormError}</span>

                <button

                  type="button"

                  onClick={() => setProductFormError(null)}

                  className="p-1 hover:bg-rose-500/20 rounded-lg text-rose-400"

                >

                  <X className="w-3.5 h-3.5" />

                </button>

              </div>

            )}



            {/* Enterprise Fixed Action Footer */}

            <div className={`p-4 sm:px-6 border-t flex flex-wrap items-center justify-between gap-3 shrink-0 ${isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-slate-50/90'}`}>

              <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500">

                <ShieldCheck className="w-4 h-4 text-emerald-500" />

                <span>Enterprise Product Form • Direct Cloud database Integration</span>

              </div>



              <div className="flex items-center gap-3 ml-auto">

                <button

                  type="button"

                  onClick={() => setIsProductModalOpen(false)}

                  disabled={isSavingProduct}

                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${

                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'

                  }`}

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  form="enterprise-product-form"

                  disabled={isSavingProduct}

                  title={`Save / Publish Product (${isMac ? '⌘S' : 'Ctrl+S'})`}

                  className="px-4 sm:px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap"

                >

                  {isSavingProduct ? (

                    <>

                      <RefreshCw className="w-4 h-4 animate-spin" />

                      <span className="hidden sm:inline">Saving & Syncing...</span>

                      <span className="inline sm:hidden">Saving...</span>

                    </>

                  ) : (

                    <>

                      <CheckCircle className="w-4.5 h-4.5" />

                      <span className="hidden sm:inline">

                        {editingProduct ? 'Save Product Changes' : 'Publish Genuine Product'}

                      </span>

                      <span className="inline sm:hidden">

                        {editingProduct ? 'Save' : 'Publish'}

                      </span>

                      <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono bg-white/20 rounded">

                        {isMac ? '⌘S' : 'Ctrl+S'}

                      </kbd>

                    </>

                  )}

                </button>

              </div>

            </div>

          </div>

        </div>

      )}



      {/* POS Receipt Modal */}

      {lastReceipt && (

        <POSReceiptModal storeSettings={storeSettings}

          receipt={lastReceipt}

          onClose={() => setLastReceipt(null)}

        />

      )}



      {/* Official Tax Invoice Print Modal */}

      {selectedOrderForInvoice && (

        <InvoicePrintModal

          order={selectedOrderForInvoice}

          onClose={() => setSelectedOrderForInvoice(null)}

          storeSettings={storeSettings}

        />

      )}



      {/* Single Product Unique QR Code Modal */}

      {selectedQrProduct && (

        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">

          <div className={`rounded-3xl max-w-md w-full p-6 border shadow-2xl space-y-6 ${modalBg}`}>

            <div className="flex items-center justify-between pb-4 border-b border-slate-800">

              <div className="flex items-center gap-2.5">

                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl">

                  <QrCode className="w-5 h-5" />

                </div>

                <div>

                  <h3 className={`font-bold text-base ${textTitle}`}>Product QR Code Label</h3>

                  <p className={`text-xs ${textSub}`}>Unique inventory code & shelf sticker</p>

                </div>

              </div>

              <button

                onClick={() => setSelectedQrProduct(null)}

                className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            {/* Printable Shelf Label Card Container */}

            <div className="bg-white text-slate-900 rounded-2xl p-6 border-2 border-slate-200 shadow-lg text-center space-y-4 relative overflow-hidden print:m-0 print:border-none print:shadow-none">

              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl">

                Genuine Electronics

              </div>



              <div className="pt-2 flex justify-center">

                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-inner">

                  <QRCodeSVG

                    value={JSON.stringify({

                      id: selectedQrProduct.id,

                      sku: selectedQrProduct.sku,

                      barcode: selectedQrProduct.barcode,

                      name: selectedQrProduct.name,

                      price: selectedQrProduct.price,

                      currency: 'TZS',

                      brand: selectedQrProduct.brand,

                      genuineVerified: true

                    })}

                    size={180}

                    level="H"

                    includeMargin={true}

                  />

                </div>

              </div>



              <div>

                <h4 className="font-extrabold text-base text-slate-900 leading-snug">{selectedQrProduct.name}</h4>

                <p className="text-xs font-bold text-blue-600 mt-1">{selectedQrProduct.brand} • {selectedQrProduct.category}</p>

                <div className="text-lg font-black text-slate-900 mt-2">{formatTZS(selectedQrProduct.price)}</div>

              </div>



              <div className="pt-3 border-t border-slate-200 text-left grid grid-cols-2 gap-2 text-[11px] font-mono">

                <div>

                  <span className="text-slate-400 uppercase text-[9px] block font-sans">SKU Number</span>

                  <span className="font-bold text-slate-800">{selectedQrProduct.sku}</span>

                </div>

                <div className="text-right">

                  <span className="text-slate-400 uppercase text-[9px] block font-sans">EAN / Barcode</span>

                  <span className="font-bold text-slate-800">{selectedQrProduct.barcode}</span>

                </div>

              </div>



              <div className="text-[10px] text-slate-500 font-semibold pt-1 flex items-center justify-center gap-1">

                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />

                <span>Verified Official Warranty Product Tag</span>

              </div>

            </div>



            {/* Actions */}

            <div className="space-y-2 pt-2">

              <div className="grid grid-cols-2 gap-3">

                <button

                  onClick={handlePrintSingleQr}

                  className="bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all"

                >

                  <Printer className="w-4 h-4" />

                  <span>Print Shelf Label</span>

                </button>

                <button

                  onClick={() => handleCopyQrPayload(selectedQrProduct)}

                  className={`py-3 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${

                    copiedQr

                      ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300'

                      : isDark

                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'

                      : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'

                  }`}

                >

                  {copiedQr ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}

                  <span>{copiedQr ? 'Payload Copied!' : 'Copy Payload'}</span>

                </button>

              </div>



              <button

                onClick={() => {

                  handleAddToCartPOS(selectedQrProduct);

                  setActiveTab('pos');

                  setSelectedQrProduct(null);

                  setScanMessage(`Added "${selectedQrProduct.name}" to POS Cart!`);

                }}

                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"

              >

                <ShoppingCart className="w-4 h-4" />

                <span>Add Directly to POS Terminal Sale</span>

              </button>

            </div>

          </div>

        </div>

      )}



      {/* QR Code Scanner & Inventory Lookup Modal */}

      {isScannerOpen && (

        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">

          <div className={`rounded-3xl max-w-lg w-full p-6 border shadow-2xl space-y-6 ${modalBg}`}>

            <div className="flex items-center justify-between pb-4 border-b border-slate-800">

              <div className="flex items-center gap-2.5">

                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl">

                  <Scan className="w-5 h-5" />

                </div>

                <div>

                  <h3 className={`font-bold text-base ${textTitle}`}>Admin QR Code Scanner</h3>

                  <p className={`text-xs ${textSub}`}>Scan product tags for quick lookup or POS sales</p>

                </div>

              </div>

              <button

                onClick={() => setIsScannerOpen(false)}

                className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            {/* Simulated Camera Viewfinder */}

            <div className="relative bg-black rounded-2xl border-2 border-indigo-500/50 h-56 flex flex-col items-center justify-center overflow-hidden shadow-inner">

              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-black to-black"></div>

              

              {/* Laser Scan Animation */}

              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] animate-pulse"></div>



              {/* Viewfinder Bounding Box */}

              <div className="relative z-10 w-40 h-40 border-2 border-dashed border-indigo-400/80 rounded-2xl flex items-center justify-center p-2">

                <div className="w-full h-full border border-indigo-500/30 rounded-xl flex items-center justify-center bg-indigo-950/20">

                  <QrCode className="w-16 h-16 text-indigo-400/60 animate-pulse" />

                </div>

              </div>



              <div className="absolute bottom-3 inset-x-0 text-center z-10">

                <span className="bg-slate-900/90 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold px-3 py-1 rounded-full shadow">

                  Center QR code in viewfinder

                </span>

              </div>

            </div>



            {/* Scanner Input / Tester */}

            <div className="space-y-3">

              <label className={`block text-xs font-semibold ${textSub}`}>Or Type / Paste Scanned Code</label>

              <div className="flex gap-2">

                <input

                  type="text"

                  placeholder="Paste scanned QR JSON, SKU, or Barcode..."

                  onKeyDown={(e) => {

                    if (e.key === 'Enter') {

                      handleScanQrCode((e.target as HTMLInputElement).value);

                      (e.target as HTMLInputElement).value = '';

                    }

                  }}

                  className={`flex-1 rounded-xl px-4 py-2.5 text-xs ${inputBg}`}

                />

                <button

                  onClick={(e) => {

                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);

                    if (input && input.value) {

                      handleScanQrCode(input.value);

                      input.value = '';

                    }

                  }}

                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all shrink-0"

                >

                  Lookup

                </button>

              </div>

            </div>



            {/* Quick One-Click Scan Simulator for All Products */}

            <div>

              <label className={`block text-xs font-bold mb-2 flex items-center gap-1.5 ${textTitle}`}>

                <Sparkles className="w-3.5 h-3.5 text-amber-400" />

                <span>Simulate Scanning Inventory Product</span>

              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">

                {products.map((p) => (

                  <button

                    key={p.id}

                    onClick={() => {

                      handleScanQrCode(p.barcode);

                      setIsScannerOpen(false);

                    }}

                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${

                      isDark

                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-indigo-500/50'

                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'

                    }`}

                  >

                    <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />

                    <div className="overflow-hidden flex-1">

                      <div className={`text-xs font-bold truncate ${textTitle}`}>{p.name}</div>

                      <div className="text-[10px] font-mono text-indigo-400 truncate">{p.sku}</div>

                    </div>

                  </button>

                ))}

              </div>

            </div>

          </div>

        </div>

      )}



      {/* Bulk QR Code Printable Sheet Modal */}

      {isBulkQrModalOpen && (

        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">

          <div className={`rounded-3xl max-w-3xl w-full p-6 border shadow-2xl space-y-6 max-h-[90vh] flex flex-col ${modalBg}`}>

            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">

              <div className="flex items-center gap-2.5">

                <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl">

                  <Printer className="w-5 h-5" />

                </div>

                <div>

                  <h3 className={`font-bold text-base ${textTitle}`}>Print All Product QR Labels</h3>

                  <p className={`text-xs ${textSub}`}>{products.length} Inventory Product Shelf Tags</p>

                </div>

              </div>

              <button

                onClick={() => setIsBulkQrModalOpen(false)}

                className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            {/* Multi-Label Printable Grid */}

            <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

              {products.map((p) => (

                <div key={p.id} className="bg-white text-slate-900 rounded-xl p-4 border border-slate-200 shadow-sm text-center space-y-2">

                  <div className="flex justify-center">

                    <QRCodeSVG

                      value={JSON.stringify({ id: p.id, sku: p.sku, barcode: p.barcode, name: p.name, price: p.price })}

                      size={100}

                      level="M"

                    />

                  </div>

                  <h4 className="font-bold text-xs line-clamp-1 text-slate-900">{p.name}</h4>

                  <div className="text-xs font-black text-blue-600">{formatTZS(p.price)}</div>

                  <div className="text-[9px] font-mono text-slate-500 pt-1 border-t border-slate-100 flex justify-between">

                    <span>{p.sku}</span>

                    <span>{p.brand}</span>

                  </div>

                </div>

              ))}

            </div>



            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 shrink-0">

              <button

                onClick={() => setIsBulkQrModalOpen(false)}

                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-colors ${

                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'

                }`}

              >

                Close

              </button>

              <button

                onClick={handlePrintSingleQr}

                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all"

              >

                <Printer className="w-4 h-4" />

                <span>Print All Labels</span>

              </button>

            </div>

          </div>

        </div>

      )}

      {/* 1. ADD / EDIT STAFF MODAL */}

      {isStaffModalOpen && (

        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">

          <div className={`w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border transition-all animate-in fade-in zoom-in-95 my-8 ${modalBg}`}>

            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>

              <div className="flex items-center gap-2.5">

                <div className="p-2 bg-blue-600/10 text-blue-500 rounded-xl">

                  {editingStaffMember ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}

                </div>

                <div>

                  <h2 className={`text-base font-black tracking-tight ${textTitle}`}>

                    {editingStaffMember ? `Edit Staff Member: ${editingStaffMember.name}` : 'Add New Real Staff Member'}

                  </h2>

                  <p className={`text-[11px] ${textSub}`}>

                    {editingStaffMember ? 'Update permissions and credentials' : 'Create authenticated store operator'}

                  </p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => {

                  setIsStaffModalOpen(false);

                  setEditingStaffMember(null);

                }}

                className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            <form

              onSubmit={async (e) => {

                e.preventDefault();

                if (editingStaffMember) {

                  if (updateStaff) {

                    if (editingStaffMember.avatar && editingStaffMember.avatar !== staffForm.avatar) {

                      await deleteStorageImage(editingStaffMember.avatar);

                    }

                    await updateStaff({

                      ...editingStaffMember,

                      name: staffForm.name,

                      email: staffForm.email,

                      phone: staffForm.phone,

                      role: staffForm.role,

                      permissions: staffForm.permissions,

                      status: staffForm.status,

                      avatar: staffForm.avatar

                    });

                  }

                } else {

                  if (addStaff) {

                    await addStaff({

                      name: staffForm.name,

                      email: staffForm.email,

                      phone: staffForm.phone,

                      role: staffForm.role,

                      permissions: staffForm.permissions,

                      status: staffForm.status,

                      avatar: staffForm.avatar,

                      password: staffForm.password

                    });

                  }

                }

                setIsStaffModalOpen(false);

                setEditingStaffMember(null);

              }}

              className="p-5 space-y-4 max-h-[75vh] overflow-y-auto"

            >

              {/* Name & Phone */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>

                  <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Full Name *</label>

                  <input

                    type="text"

                    required

                    value={staffForm.name}

                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}

                    placeholder="e.g. Juma Ally"

                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium ${inputBg}`}

                  />

                </div>

                <div>

                  <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Phone Number</label>

                  <input

                    type="tel"

                    value={staffForm.phone}

                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}

                    placeholder="e.g. +255 754 000 111"

                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium ${inputBg}`}

                  />

                </div>

              </div>



              {/* Email Address */}

              <div>

                <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Email Address *</label>

                <input

                  type="email"

                  required

                  value={staffForm.email}

                  onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}

                  placeholder="e.g. juma@genuine-electronics.com"

                  className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium ${inputBg}`}

                />

              </div>



              {/* Role & Status */}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>

                  <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Assigned Role *</label>

                  <select

                    value={staffForm.role}

                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}

                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium ${inputBg}`}

                  >

                    <option value="Store Manager">Store Manager</option>

                    <option value="Cashier / POS Associate">Cashier / POS Associate</option>

                    <option value="Inventory Specialist">Inventory Specialist</option>

                    <option value="Customer Support">Customer Support</option>

                    <option value="Service Technician">Service Technician</option>

                    <option value="Administrator">Administrator</option>

                  </select>

                </div>

                <div>

                  <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Account Status *</label>

                  <select

                    value={staffForm.status}

                    onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value as any })}

                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-medium ${inputBg}`}

                  >

                    <option value="Active">Active (Permitted to Log In)</option>

                    <option value="Inactive">Inactive / Suspended</option>

                  </select>

                </div>

              </div>



              {/* Password for new staff */}

              {!editingStaffMember && (

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>

                  <div className="flex items-center justify-between mb-1.5">

                    <label className={`block text-xs font-bold ${textSub}`}>Initial Account Password *</label>

                    <button

                      type="button"

                      onClick={() => setStaffForm({ ...staffForm, password: `GE@${Math.floor(100000 + Math.random() * 900000)}` })}

                      className="text-[11px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1"

                    >

                      <Sparkles className="w-3 h-3" /> Auto-Generate

                    </button>

                  </div>

                  <input

                    type="text"

                    required

                    value={staffForm.password}

                    onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}

                    placeholder="Enter or generate password..."

                    className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono font-bold ${inputBg}`}

                  />

                  <span className="text-[10px] text-slate-500 block mt-1">This password will be securely hashed in cloud authentication vault.</span>

                </div>

              )}



              {/* Avatar URL or Upload */}

              <div>

                <label className={`block text-xs font-bold mb-1.5 ${textSub}`}>Profile Photo</label>

                <div className="flex items-center gap-3">

                  <img

                    src={staffForm.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}

                    alt="Staff Avatar"

                    className="w-12 h-12 rounded-xl object-cover border border-slate-700"

                  />

                  <div className="flex-1 space-y-1.5">

                    <input

                      type="text"

                      value={staffForm.avatar}

                      onChange={(e) => setStaffForm({ ...staffForm, avatar: e.target.value })}

                      placeholder="Photo URL or upload image"

                      className={`w-full px-3 py-1.5 rounded-xl border text-[11px] font-mono ${inputBg}`}

                    />

                    <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-500 hover:text-blue-400 cursor-pointer">

                      <Upload className="w-3.5 h-3.5" />

                      <span>{staffAvatarUploading ? 'Uploading...' : 'Upload Profile Picture'}</span>

                      <input

                        type="file"

                        accept="image/*"

                        disabled={staffAvatarUploading}

                        onChange={async (e) => {

                          const file = e.target.files?.[0];

                          if (!file) return;

                          try {

                            setStaffAvatarUploading(true);

                            const url = await processAndUploadImage(file);

                            setStaffForm((prev) => ({ ...prev, avatar: url }));

                          } catch (err: any) {

                            console.error('Failed to upload avatar:', err);

                            alert('Upload error: ' + (err?.message || 'Failed to upload photo'));

                          } finally {

                            setStaffAvatarUploading(false);

                          }

                        }}

                        className="hidden"

                      />

                    </label>

                  </div>

                </div>

              </div>



              {/* Granular Permissions */}

              <div className={`p-3.5 rounded-2xl border space-y-2.5 ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>

                <label className={`block text-xs font-bold ${textTitle}`}>System Permissions Granted</label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">

                  {[

                    { id: 'POS_ACCESS', label: 'POS Sales Terminal', desc: 'Process customer checkouts' },

                    { id: 'VIEW_CATALOG', label: 'Product Catalog', desc: 'Browse catalog & technical specs' },

                    { id: 'MANAGE_PRODUCTS', label: 'Product Manager', desc: 'Add / Edit / Delete items & prices' },

                    { id: 'MANAGE_ORDERS', label: 'Orders & Dispatch', desc: 'Update delivery status & tracking' },

                    { id: 'CRM_ACCESS', label: 'Customer CRM', desc: 'View customer contacts & history' },

                    { id: 'STORE_SETTINGS', label: 'Store Configuration', desc: 'Modify banner & brand settings' },

                  ].map((perm) => {

                    const isChecked = staffForm.permissions.includes(perm.id);

                    return (

                      <label

                        key={perm.id}

                        className={`flex items-start gap-2 p-2 rounded-xl border cursor-pointer transition-all ${

                          isChecked

                            ? isDark

                              ? 'bg-blue-950/40 border-blue-600/60 text-blue-300'

                              : 'bg-blue-50 border-blue-300 text-blue-900'

                            : isDark

                            ? 'bg-slate-900/40 border-slate-800 text-slate-400'

                            : 'bg-white border-slate-200 text-slate-600'

                        }`}

                      >

                        <input

                          type="checkbox"

                          checked={isChecked}

                          onChange={(e) => {

                            if (e.target.checked) {

                              setStaffForm({ ...staffForm, permissions: [...staffForm.permissions, perm.id] });

                            } else {

                              setStaffForm({ ...staffForm, permissions: staffForm.permissions.filter((p) => p !== perm.id) });

                            }

                          }}

                          className="mt-0.5 rounded text-blue-600"

                        />

                        <div>

                          <div className="font-bold text-[11px]">{perm.label}</div>

                          <div className="text-[10px] text-slate-500">{perm.desc}</div>

                        </div>

                      </label>

                    );

                  })}

                </div>

              </div>



              {/* Submit / Cancel Buttons */}

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3 shrink-0">

                <button

                  type="button"

                  onClick={() => {

                    setIsStaffModalOpen(false);

                    setEditingStaffMember(null);

                  }}

                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-colors ${

                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'

                  }`}

                >

                  Cancel

                </button>

                <button

                  type="submit"

                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all"

                >

                  <Check className="w-4 h-4" />

                  <span>{editingStaffMember ? 'Update Staff Member' : 'Save & Provision Access'}</span>

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* 2. STAFF PROFILE & DETAILED PERFORMANCE MODAL */}

      {viewingStaffProfile && (

        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">

          <div className={`w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border transition-all animate-in fade-in zoom-in-95 my-8 ${modalBg}`}>

            {/* Header with profile banner */}

            <div className="relative p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">

              <div className="flex items-center gap-4">

                {viewingStaffProfile.avatar ? (

                  <img

                    src={viewingStaffProfile.avatar}

                    alt={viewingStaffProfile.name}

                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-xl"

                  />

                ) : (

                  <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-xl">

                    {viewingStaffProfile.name.substring(0, 2).toUpperCase()}

                  </div>

                )}

                <div>

                  <div className="flex items-center gap-2">

                    <h2 className="text-xl font-black">{viewingStaffProfile.name}</h2>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider">

                      {viewingStaffProfile.role}

                    </span>

                  </div>

                  <p className="text-xs text-blue-200 mt-0.5 font-mono">{viewingStaffProfile.email}</p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => setViewingStaffProfile(null)}

                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            {/* Performance & Details Content */}

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

              {/* Contact and Status Info */}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                  <span className="text-[11px] text-slate-400 font-bold uppercase block">Phone Contact</span>

                  <span className={`text-xs font-mono font-bold mt-1 block ${textTitle}`}>

                    {viewingStaffProfile.phone || 'No phone registered'}

                  </span>

                </div>

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                  <span className="text-[11px] text-slate-400 font-bold uppercase block">Account Status</span>

                  <span className={`text-xs font-bold mt-1 inline-flex items-center gap-1 ${viewingStaffProfile.status === 'Active' ? 'text-emerald-400' : 'text-red-400'}`}>

                    <span className={`w-2 h-2 rounded-full ${viewingStaffProfile.status === 'Active' ? 'bg-emerald-500' : 'bg-red-500'}`} />

                    {viewingStaffProfile.status}

                  </span>

                </div>

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                  <span className="text-[11px] text-slate-400 font-bold uppercase block">Joined Date</span>

                  <span className={`text-xs font-bold mt-1 block ${textTitle}`}>

                    {viewingStaffProfile.createdAt ? new Date(viewingStaffProfile.createdAt).toLocaleDateString() : 'Verified Staff'}

                  </span>

                </div>

              </div>



              {/* POS Sales Metrics */}

              {(() => {

                const cashierTx = posTransactions.filter((tx) => 
                  Boolean(tx.cashierName) && (
                    Boolean(viewingStaffProfile.name && String(tx.cashierName).toLowerCase() === String(viewingStaffProfile.name).toLowerCase()) ||
                    Boolean(viewingStaffProfile.email && String(tx.cashierName).toLowerCase() === String(viewingStaffProfile.email).toLowerCase())
                  )
                );

                const totalSales = cashierTx.reduce((acc, tx) => acc + (tx.total || 0), 0);

                const avgTicket = cashierTx.length > 0 ? totalSales / cashierTx.length : 0;



                return (

                  <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-800/20 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                    <h3 className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>Point of Sale Checkout Performance</h3>

                    <div className="grid grid-cols-3 gap-3">

                      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">

                        <span className="text-[10px] text-blue-400 font-bold uppercase">Total Transactions</span>

                        <div className="text-xl font-black text-blue-400 mt-1">{cashierTx.length}</div>

                      </div>

                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">

                        <span className="text-[10px] text-emerald-400 font-bold uppercase">Total POS Revenue</span>

                        <div className="text-sm font-black text-emerald-400 mt-1 truncate">{formatTZS(totalSales)}</div>

                      </div>

                      <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">

                        <span className="text-[10px] text-purple-400 font-bold uppercase">Average Basket</span>

                        <div className="text-sm font-black text-purple-400 mt-1 truncate">{formatTZS(avgTicket)}</div>

                      </div>

                    </div>

                  </div>

                );

              })()}



              {/* Granted Permissions List */}

              <div>

                <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${textTitle}`}>System Permissions & Access</h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">

                  {(viewingStaffProfile.permissions || ['POS_ACCESS']).map((perm) => (

                    <div

                      key={perm}

                      className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-semibold ${isDark ? 'bg-slate-800/50 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-800'}`}

                    >

                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />

                      <span className="truncate">{perm.replace(/_/g, ' ')}</span>

                    </div>

                  ))}

                </div>

              </div>



              {/* Actions */}

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">

                <button

                  type="button"

                  onClick={() => {

                    const st = viewingStaffProfile;

                    setViewingStaffProfile(null);

                    setResetPasswordStaff(st);

                    setNewStaffPasswordInput(`GE@${Math.floor(100000 + Math.random() * 900000)}`);

                    setResetSuccessMessage(null);

                  }}

                  className="px-4 py-2 rounded-xl text-xs font-bold text-purple-400 hover:bg-purple-950/40 border border-purple-800/40 flex items-center gap-1.5 transition-colors"

                >

                  <Key className="w-3.5 h-3.5" />

                  <span>Reset Staff Password</span>

                </button>



                <div className="flex items-center gap-2">

                  {deleteStaff && (

                    <button

                      type="button"

                      onClick={async () => {

                        const st = viewingStaffProfile;

                        if (confirm(`Are you sure you want to permanently delete staff member "${st.name}" (${st.email})? This action will revoke their login access immediately.`)) {

                          setViewingStaffProfile(null);

                          await deleteStaff(st.id);

                        }

                      }}

                      className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 flex items-center gap-1.5 transition-all"

                    >

                      <Trash2 className="w-3.5 h-3.5" />

                      <span>Delete Staff</span>

                    </button>

                  )}

                  <button

                    type="button"

                    onClick={() => {

                      const st = viewingStaffProfile;

                      setViewingStaffProfile(null);

                      setEditingStaffMember(st);

                      setStaffForm({

                        name: st.name,

                        email: st.email,

                        phone: st.phone || '',

                        role: st.role,

                        password: '',

                        permissions: st.permissions || ['POS_ACCESS', 'VIEW_CATALOG'],

                        status: st.status,

                        avatar: st.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'

                      });

                      setIsStaffModalOpen(true);

                    }}

                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-amber-600/20"

                  >

                    <Edit className="w-3.5 h-3.5" />

                    <span>Edit Staff Details</span>

                  </button>

                  <button

                    type="button"

                    onClick={() => setViewingStaffProfile(null)}

                    className={`px-4 py-2 rounded-xl text-xs font-bold ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}

                  >

                    Close

                  </button>

                </div>

              </div>

            </div>

          </div>

        </div>

      )}



      {/* 3. RESET STAFF PASSWORD MODAL */}

      {resetPasswordStaff && (

        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">

          <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border transition-all animate-in fade-in zoom-in-95 ${modalBg}`}>

            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>

              <div className="flex items-center gap-2.5">

                <div className="p-2 bg-purple-600/10 text-purple-400 rounded-xl">

                  <Key className="w-5 h-5" />

                </div>

                <div>

                  <h2 className={`text-base font-black tracking-tight ${textTitle}`}>Reset Staff Password</h2>

                  <p className={`text-[11px] ${textSub}`}>{resetPasswordStaff.name} ({resetPasswordStaff.email})</p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => {

                  setResetPasswordStaff(null);

                  setResetSuccessMessage(null);

                }}

                className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            <div className="p-5 space-y-4">

              {resetSuccessMessage ? (

                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-700/60 text-center space-y-3">

                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">

                    <Check className="w-5 h-5" />

                  </div>

                  <div>

                    <h4 className="font-bold text-xs text-emerald-300">Password Reset Successfully!</h4>

                    <p className="text-[11px] text-slate-400 mt-0.5">The temporary login password for {resetPasswordStaff.name} is:</p>

                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between font-mono text-sm font-black text-amber-400">

                    <span>{resetSuccessMessage}</span>

                    <button

                      type="button"

                      onClick={() => {

                        navigator.clipboard.writeText(resetSuccessMessage);

                        alert('Password copied to clipboard!');

                      }}

                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 font-sans"

                    >

                      <Copy className="w-3.5 h-3.5" /> Copy

                    </button>

                  </div>

                  <button

                    type="button"

                    onClick={() => {

                      setResetPasswordStaff(null);

                      setResetSuccessMessage(null);

                    }}

                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors"

                  >

                    Done

                  </button>

                </div>

              ) : (

                <div className="space-y-4">

                  <div>

                    <div className="flex items-center justify-between mb-1.5">

                      <label className={`block text-xs font-bold ${textSub}`}>New Secure Password</label>

                      <button

                        type="button"

                        onClick={() => setNewStaffPasswordInput(`GE@${Math.floor(100000 + Math.random() * 900000)}`)}

                        className="text-[11px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1"

                      >

                        <Sparkles className="w-3 h-3" /> Auto-Generate

                      </button>

                    </div>

                    <input

                      type="text"

                      required

                      value={newStaffPasswordInput}

                      onChange={(e) => setNewStaffPasswordInput(e.target.value)}

                      placeholder="Enter new password..."

                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold ${inputBg}`}

                    />

                    <span className="text-[10px] text-slate-500 block mt-1">

                      This updates the staff credentials in cloud authentication vault immediately.

                    </span>

                  </div>



                  <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">

                    <button

                      type="button"

                      onClick={() => setResetPasswordStaff(null)}

                      className={`px-4 py-2 rounded-xl text-xs font-bold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}

                    >

                      Cancel

                    </button>

                    <button

                      type="button"

                      onClick={async () => {

                        if (!newStaffPasswordInput) return;

                        if (resetStaffPassword) {

                          await resetStaffPassword(resetPasswordStaff.id, newStaffPasswordInput);

                          setResetSuccessMessage(newStaffPasswordInput);

                        }

                      }}

                      className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition-all"

                    >

                      <Key className="w-3.5 h-3.5" />

                      <span>Confirm & Reset Password</span>

                    </button>

                  </div>

                </div>

              )}

            </div>

          </div>

        </div>

      )}



      {/* 4. CUSTOMER CRM PROFILE & ORDER HISTORY MODAL */}
      <AnimatePresence>
        {selectedCustomerForCrm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border my-8 ${modalBg}`}
            >

            {/* Customer Header Banner */}

            <div className="p-6 bg-gradient-to-r from-emerald-900 to-teal-900 text-white flex items-center justify-between">

              <div className="flex items-center gap-4">

                <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white font-black text-2xl flex items-center justify-center shadow-xl">

                  {selectedCustomerForCrm.name.substring(0, 2).toUpperCase()}

                </div>

                <div>

                  <div className="flex items-center gap-2">

                    <h2 className="text-xl font-black">{selectedCustomerForCrm.name}</h2>

                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wider">

                      {selectedCustomerForCrm.tier}

                    </span>

                  </div>

                  <div className="flex items-center gap-4 text-xs text-emerald-200 mt-1 font-mono">

                    <span className="flex items-center gap-1">

                      <Mail className="w-3.5 h-3.5" /> {selectedCustomerForCrm.email}

                    </span>

                    {selectedCustomerForCrm.phone && (

                      <span className="flex items-center gap-1">

                        <Phone className="w-3.5 h-3.5 text-emerald-300" /> {selectedCustomerForCrm.phone}

                      </span>

                    )}

                  </div>

                </div>

              </div>

              <button

                type="button"

                onClick={() => setSelectedCustomerForCrm(null)}

                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            {/* Content Body */}

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

              {/* Direct Action Toolbar */}

              <div className="flex flex-wrap items-center gap-2.5">

                {selectedCustomerForCrm.phone && (

                  <a

                    href={`https://wa.me/${selectedCustomerForCrm.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${selectedCustomerForCrm.name}, thank you for choosing Genuine Electronics Tanzania. How may we assist you today?`)}`}

                    target="_blank"

                    rel="noreferrer"

                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"

                  >

                    <MessageCircle className="w-4 h-4" />

                    <span>WhatsApp Direct</span>

                  </a>

                )}

                {selectedCustomerForCrm.phone && (

                  <a

                    href={`tel:${selectedCustomerForCrm.phone}`}

                    className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${

                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'

                    }`}

                  >

                    <Phone className="w-4 h-4 text-emerald-500" />

                    <span>Call Customer</span>

                  </a>

                )}

                <a

                  href={`mailto:${selectedCustomerForCrm.email}?subject=Genuine%20Electronics%20Tanzania%20-%20Customer%20Support`}

                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${

                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'

                  }`}

                >

                  <Mail className="w-4 h-4 text-blue-500" />

                  <span>Send Email</span>

                </a>

                {resetCustomerPassword && (

                  <button

                    type="button"

                    onClick={() => {

                      const c = selectedCustomerForCrm;

                      setResetPasswordCustomer(c);

                      setNewCustomerPasswordInput(`GE@${Math.floor(100000 + Math.random() * 900000)}`);

                      setCustomerResetSuccessMessage(null);

                    }}

                    className="px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 font-bold text-xs flex items-center gap-1.5 transition-all"

                  >

                    <Key className="w-4 h-4" />

                    <span>Reset Password</span>

                  </button>

                )}

                {(deleteCustomer || deleteUser) && (

                  <button

                    type="button"

                    onClick={() => {

                      if (confirm(`Are you sure you want to permanently delete customer profile "${selectedCustomerForCrm.name}" (${selectedCustomerForCrm.email})? This action cannot be undone.`)) {

                        const handler = deleteCustomer || deleteUser;

                        const c = selectedCustomerForCrm;

                        setSelectedCustomerForCrm(null);

                        if (handler) handler(c.id, c.email);

                      }

                    }}

                    className="px-4 py-2 rounded-xl bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 font-bold text-xs flex items-center gap-1.5 transition-all sm:ml-auto"

                  >

                    <Trash2 className="w-4 h-4" />

                    <span>Delete User Profile</span>

                  </button>

                )}

              </div>



              {/* Metrics Summary */}

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">

                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Orders</span>

                  <div className="text-xl font-black text-blue-500 mt-1">{selectedCustomerForCrm.totalOrders}</div>

                </div>



                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Items Purchased</span>

                  <div className="text-xl font-black text-indigo-400 mt-1 flex items-center gap-1.5">

                    <Package className="w-4 h-4 text-indigo-400 shrink-0" />

                    <span>
                      {selectedCustomerForCrm.totalItemsPurchased ||
                        selectedCustomerForCrm.ordersList.reduce((sum, ord) => sum + (ord.items || []).reduce((s, it) => s + (it.quantity || 1), 0), 0)}
                    </span>

                  </div>

                </div>



                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Lifetime Spend</span>

                  <div className="text-sm font-black text-emerald-500 mt-1 truncate">{formatTZS(selectedCustomerForCrm.lifetimeValue)}</div>

                </div>



                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Avg Order Basket</span>

                  <div className="text-sm font-black text-purple-500 mt-1 truncate">

                    {formatTZS(selectedCustomerForCrm.totalOrders > 0 ? selectedCustomerForCrm.lifetimeValue / selectedCustomerForCrm.totalOrders : 0)}

                  </div>

                </div>



                <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Last Order</span>

                  <div className="text-xs font-bold text-slate-300 mt-1">

                    {selectedCustomerForCrm.lastOrder ? new Date(selectedCustomerForCrm.lastOrder).toLocaleDateString() : 'No orders yet'}

                  </div>

                </div>

              </div>



              {/* Delivery Address Details */}

              <div className={`p-4 rounded-2xl border space-y-1.5 ${isDark ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>

                <div className="flex items-center gap-2">

                  <MapPin className="w-4 h-4 text-rose-500 shrink-0" />

                  <h3 className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>Shipping & Delivery Address</h3>

                </div>

                <p className={`text-xs font-medium pl-6 ${textSub}`}>

                  {selectedCustomerForCrm.address || 'Standard Delivery within Dar es Salaam, Tanzania'}

                  {selectedCustomerForCrm.city ? `, ${selectedCustomerForCrm.city}` : ''}

                </p>

              </div>



              {/* Complete Order History for this Customer */}

              <div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">

                  <h3 className={`text-xs font-bold uppercase tracking-wider ${textTitle}`}>

                    Customer Purchase History ({selectedCustomerForCrm.ordersList.length})

                  </h3>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">

                    {(['all', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as const).map((st) => (

                      <button

                        key={st}

                        type="button"

                        onClick={() => setCustomerOrderFilter(st)}

                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${

                          customerOrderFilter === st

                            ? 'bg-blue-600 text-white shadow-sm'

                            : isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'

                        }`}

                      >

                        {st === 'all' ? 'All Orders' : st}

                      </button>

                    ))}

                  </div>

                </div>



                {(() => {

                  const filteredCustomerOrders = selectedCustomerForCrm.ordersList.filter(

                    (ord) => customerOrderFilter === 'all' || ord.status === customerOrderFilter

                  );



                  if (filteredCustomerOrders.length === 0) {

                    return (

                      <div className={`p-6 rounded-2xl border text-center text-xs text-slate-400 ${cardBg}`}>

                        No {customerOrderFilter === 'all' ? '' : String(customerOrderFilter || '').toLowerCase()} orders found for this customer.

                      </div>

                    );

                  }



                  return (

                    <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>

                      <table className="w-full text-left text-xs">

                        <thead>

                          <tr className={`border-b font-bold uppercase tracking-wider ${tableHeaderBg}`}>

                            <th className="p-3">Order ID</th>

                            <th className="p-3">Date</th>

                            <th className="p-3">Items Summary</th>

                            <th className="p-3">Total Amount</th>

                            <th className="p-3">Status Management</th>

                            <th className="p-3 text-right">Actions</th>

                          </tr>

                        </thead>

                        <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>

                          {filteredCustomerOrders.map((ord) => (

                            <tr key={ord.id} className={`transition-colors ${tableRowHover}`}>

                              <td className="p-3 font-mono font-bold text-blue-500">#{ord.id.substring(0, 8)}</td>

                              <td className="p-3 text-slate-400 whitespace-nowrap">{new Date(ord.createdAt).toLocaleDateString()}</td>

                              <td className="p-3 max-w-[280px]">

                                <div className="space-y-1.5">

                                  {(ord.items || []).slice(0, 3).map((item, idx) => (

                                    <div key={idx} className="flex items-center gap-2 text-xs">

                                      {item.product?.image ? (

                                        <img

                                          src={item.product.image}

                                          alt={item.product.name}

                                          className="w-6 h-6 rounded-md object-cover border border-slate-700/60 shrink-0"

                                        />

                                      ) : (

                                        <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center shrink-0">

                                          <Package className="w-3 h-3 text-slate-400" />

                                        </div>

                                      )}

                                      <span className="truncate text-slate-200 font-medium">{item.product?.name || 'Product'}</span>

                                      <span className="ml-auto text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/40 shrink-0">

                                        x{item.quantity}

                                      </span>

                                    </div>

                                  ))}

                                  {(ord.items || []).length > 3 && (

                                    <div className="text-[10px] text-slate-400 font-medium pl-8">

                                      +{(ord.items || []).length - 3} more items in order

                                    </div>

                                  )}

                                </div>

                              </td>

                              <td className="p-3 font-mono font-black text-emerald-400 whitespace-nowrap">

                                {formatTZS(ord.totalAmount)}

                              </td>

                              <td className="p-3">

                                <select

                                  value={ord.status}

                                  onChange={(e) => {

                                    const nextStatus = e.target.value as Order['status'];

                                    updateOrderStatus(ord.id, nextStatus);

                                    ord.status = nextStatus;

                                  }}

                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border outline-none cursor-pointer ${

                                    ord.status === 'Delivered'

                                      ? 'bg-emerald-950/50 text-emerald-400 border-emerald-700/60'

                                      : ord.status === 'Shipped'

                                      ? 'bg-blue-950/50 text-blue-400 border-blue-700/60'

                                      : ord.status === 'Processing'

                                      ? 'bg-purple-950/50 text-purple-400 border-purple-700/60'

                                      : ord.status === 'Cancelled'

                                      ? 'bg-rose-950/50 text-rose-400 border-rose-700/60'

                                      : 'bg-amber-950/50 text-amber-400 border-amber-700/60'

                                  }`}

                                >

                                  <option value="Pending">Pending</option>

                                  <option value="Processing">Processing</option>

                                  <option value="Shipped">Shipped</option>

                                  <option value="Delivered">Delivered</option>

                                  <option value="Cancelled">Cancelled</option>

                                </select>

                              </td>

                              <td className="p-3 text-right">

                                <button

                                  type="button"

                                  onClick={() => {

                                    setSelectedOrderForDispatch(ord);

                                    setDispatchStatus(ord.status);

                                    setDispatchTrackingNumber(ord.trackingNumber || `TRK-TZ-${Math.floor(100000 + Math.random() * 900000)}`);

                                    setDispatchCourier(ord.courier || 'DAR Express (Local)');

                                    setDispatchEstimatedDelivery(ord.estimatedDelivery || '');

                                    setDispatchNotes(ord.deliveryNotes || '');

                                    const paidVal = ord.paidAmount ?? (ord.paymentStatus === 'Paid' ? ord.totalAmount : 0);

                                    setDispatchPaidAmount(paidVal);

                                    setDispatchPaymentStatus(ord.paymentStatus || (paidVal >= ord.totalAmount ? 'Paid' : paidVal > 0 ? 'Partial' : 'Pending'));

                                  }}

                                  className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center gap-1 ml-auto shadow-sm"

                                  title="Dispatch & Tracking Details"

                                >

                                  <Truck className="w-3 h-3" />

                                  <span>Dispatch</span>

                                </button>

                              </td>

                            </tr>

                          ))}

                        </tbody>

                      </table>

                    </div>

                  );

                })()}

              </div>

            </div>



              {/* Close Button */}

              <div className="pt-3 border-t border-slate-800 flex justify-end">

                <button

                  type="button"

                  onClick={() => setSelectedCustomerForCrm(null)}

                  className={`px-5 py-2 rounded-xl text-xs font-bold ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}

                >

                  Close CRM Profile
                </button>
              </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>



      {/* 5. CUSTOMER PASSWORD RESET MODAL */}

      {resetPasswordCustomer && (

        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">

          <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border transition-all animate-in fade-in zoom-in-95 ${modalBg}`}>

            <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}>

              <div className="flex items-center gap-2.5">

                <div className="p-2 bg-purple-600/10 text-purple-400 rounded-xl">

                  <Key className="w-5 h-5" />

                </div>

                <div>

                  <h2 className={`text-base font-black tracking-tight ${textTitle}`}>Reset Customer Password</h2>

                  <p className={`text-[11px] ${textSub}`}>{resetPasswordCustomer.name} ({resetPasswordCustomer.email})</p>

                </div>

              </div>

              <button

                type="button"

                onClick={() => {

                  setResetPasswordCustomer(null);

                  setCustomerResetSuccessMessage(null);

                }}

                className={`p-2 rounded-xl transition-colors ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            <div className="p-5 space-y-4">

              {customerResetSuccessMessage ? (

                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-700/60 text-center space-y-3">

                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">

                    <Check className="w-5 h-5" />

                  </div>

                  <div>

                    <h4 className="font-bold text-xs text-emerald-300">Customer Password Reset Successfully!</h4>

                    <p className="text-[11px] text-slate-400 mt-0.5">The new login password for {resetPasswordCustomer.name} is:</p>

                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-between font-mono text-sm font-black text-amber-400">

                    <span>{customerResetSuccessMessage}</span>

                    <button

                      type="button"

                      onClick={() => {

                        navigator.clipboard.writeText(customerResetSuccessMessage);

                        alert('Password copied to clipboard!');

                      }}

                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 font-sans"

                    >

                      <Copy className="w-3.5 h-3.5" /> Copy

                    </button>

                  </div>

                  <button

                    type="button"

                    onClick={() => {

                      setResetPasswordCustomer(null);

                      setCustomerResetSuccessMessage(null);

                    }}

                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors"

                  >

                    Done

                  </button>

                </div>

              ) : (

                <div className="space-y-4">

                  <div>

                    <div className="flex items-center justify-between mb-1.5">

                      <label className={`block text-xs font-bold ${textSub}`}>New Password</label>

                      <button

                        type="button"

                        onClick={() => setNewCustomerPasswordInput(`GE@${Math.floor(100000 + Math.random() * 900000)}`)}

                        className="text-[11px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1"

                      >

                        <Sparkles className="w-3 h-3" /> Auto-Generate

                      </button>

                    </div>

                    <input

                      type="text"

                      required

                      value={newCustomerPasswordInput}

                      onChange={(e) => setNewCustomerPasswordInput(e.target.value)}

                      placeholder="Enter new password (min 6 chars)..."

                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold ${inputBg}`}

                    />

                    <span className="text-[10px] text-slate-500 block mt-1">

                      Instantly updates customer credentials without needing an email verification link.

                    </span>

                  </div>



                  <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">

                    <button

                      type="button"

                      onClick={() => setResetPasswordCustomer(null)}

                      className={`px-4 py-2 rounded-xl text-xs font-bold ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}

                    >

                      Cancel

                    </button>

                    <button

                      type="button"

                      onClick={async () => {

                        if (!newCustomerPasswordInput) {

                          showAlert('Validation Error', 'Please enter or generate a new password.', 'warning');

                          return;

                        }

                        if (resetCustomerPassword) {

                          await resetCustomerPassword(resetPasswordCustomer.id, newCustomerPasswordInput, resetPasswordCustomer.email);

                          setCustomerResetSuccessMessage(newCustomerPasswordInput);

                        }

                      }}

                      className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 flex items-center gap-1.5 transition-all"

                    >

                      <Key className="w-3.5 h-3.5" />

                      <span>Confirm & Reset Password</span>

                    </button>

                  </div>

                </div>

              )}

            </div>

          </div>

        </div>

      )}

      





      {/* 6. CUSTOM GLOBAL MODAL (ALERT/CONFIRM/PASSWORD) */}

      {modalConfig.isOpen && (

        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">

          <div className={`w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} animate-in zoom-in-95 duration-300`}>

            <div className="p-8 text-center space-y-6">

              {/* Modal Icon */}

              <div className="flex justify-center">

                {modalConfig.type === 'error' || modalConfig.type === 'warning' ? (

                  <div className="p-4 bg-rose-500/10 text-rose-500 rounded-3xl">

                    <ShieldAlert className="w-10 h-10" />

                  </div>

                ) : modalConfig.type === 'password' ? (

                  <div className="p-4 bg-amber-500/10 text-amber-500 rounded-3xl">

                    <Lock className="w-10 h-10" />

                  </div>

                ) : (

                  <div className="p-4 bg-blue-500/10 text-blue-500 rounded-3xl">

                    <ShieldCheck className="w-10 h-10" />

                  </div>

                )}

              </div>



              {/* Modal Content */}

              <div className="space-y-2">

                <h3 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>

                  {modalConfig.title}

                </h3>

                <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>

                  {modalConfig.message}

                </p>

              </div>



              {/* Password Input (Optional) */}

              {modalConfig.type === 'password' && (

                <div className="space-y-1 text-left">

                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">Admin Authorization Required</label>

                  <input

                    type="text"

                    autoFocus

                    placeholder="Type confirmation phrase here..."

                    className={`w-full px-5 py-4 rounded-2xl border font-mono text-sm ${inputBg}`}

                    value={modalConfig.inputValue}

                    onChange={(e) => setModalConfig({ ...modalConfig, inputValue: e.target.value })}

                  />

                </div>

              )}



              {/* Action Buttons */}

              <div className="flex flex-col gap-3 pt-2">

                <button

                  type="button"

                  onClick={() => {

                    if (modalConfig.onConfirm) {

                      modalConfig.onConfirm(modalConfig.inputValue);

                    }

                    setModalConfig({ ...modalConfig, isOpen: false });

                  }}

                  className={`w-full py-4 rounded-2xl text-sm font-bold transition-all shadow-lg ${

                    modalConfig.type === 'error' || modalConfig.type === 'warning'

                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'

                      : modalConfig.type === 'password'

                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'

                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'

                  }`}

                >

                  {modalConfig.confirmText || 'Confirm'}

                </button>

                {(modalConfig.type === 'confirm' || modalConfig.type === 'password' || modalConfig.type === 'warning') && (

                  <button

                    type="button"

                    onClick={() => {

                      if (modalConfig.onCancel) modalConfig.onCancel();

                      setModalConfig({ ...modalConfig, isOpen: false });

                    }}

                    className={`w-full py-4 rounded-2xl text-sm font-bold border transition-all ${

                      isDark ? 'border-slate-800 text-slate-400 hover:bg-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'

                    }`}

                  >

                    {modalConfig.cancelText || 'Cancel'}

                  </button>

                )}

              </div>

            </div>

          </div>

        </div>

      )}

      {/* Full-Screen Cloud Save/Update Blocking Loader */}
      <FullScreenSaveLoader
        isVisible={
          activeCloudOperations > 0 || 
          isSavingProduct || 
          isSavingSettings || 
          isSavingCategory
        }
        title={
          isSavingProduct
            ? 'Saving & Syncing Product...'
            : isSavingSettings
            ? 'Publishing Store Settings...'
            : isSavingCategory
            ? 'Saving Store Category...'
            : undefined
        }
        subtitle={
          isSavingProduct
            ? 'Processing specs, pricing, high-res gallery images, and catalog records.'
            : isSavingSettings
            ? 'Broadcasting live configurations, payment modes, and store branding globally.'
            : isSavingCategory
            ? 'Updating category hierarchy, banners, and catalog sorting.'
            : undefined
        }
        tableName={cloudOpDetails?.tableName}
        action={cloudOpDetails?.action}
        onForceDismiss={() => {
          setActiveCloudOperations(0);
          setCloudOpDetails(null);
          setIsSavingProduct(false);
          setIsSavingSettings(false);
          setIsSavingCategory(false);
          setIsMultiUploading(false);
          setIsHeroUploading(false);
          setIsLogoUploading(false);
          setIsCategoryUploading(false);
          setIsUploading(false);
          setStaffAvatarUploading(false);
        }}
      />

      {/* Global Shortcut Visual Notification / Toast Feedback */}

      {shortcutFeedback && (

        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-none">

          <div className="bg-slate-900/95 text-white border border-slate-700/80 shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3.5 backdrop-blur-xl">

            <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">

              <Zap className="w-4 h-4 text-blue-400 animate-pulse" />

            </div>

            <div className="flex flex-col">

              <span className="text-xs font-semibold text-slate-100">{shortcutFeedback.message}</span>

              <span className="text-[10px] text-slate-400">Triggered via keyboard shortcut</span>

            </div>

            <kbd className="px-2 py-1 bg-slate-800 border border-slate-600 text-blue-400 font-mono text-[11px] font-bold rounded-lg shadow-inner">

              {shortcutFeedback.key}

            </kbd>

          </div>

        </div>

      )}



      <POSSalePreviewModal
        isOpen={showPOSSalePreview}
        onClose={() => setShowPOSSalePreview(false)}
        onConfirm={handleCompletePOS}
        cart={posCart}
        total={posTotal}
        subtotal={posSubtotal}
        discount={posDiscountClamped}
        tax={posTax}
        paymentMethod={posPaymentMethod}
        isSplitMode={isSplitPaymentMode}
        splitPayments={splitPaymentsList}
        tenderedAmount={posEffectiveTendered}
        changeAmount={posChangeAmount}
        customerName={posCustomerName}
        customerPhone={posCustomerPhone}
        isLoan={Boolean(
          (!isSplitPaymentMode && (
            (posPaymentMethod || '').toLowerCase().includes('loan') || 
            (posPaymentMethod || '').toLowerCase().includes('credit') || 
            (posPaymentMethod || '').toLowerCase().includes('mkopo') ||
            (posPaymentMethod || '').toLowerCase().includes('debt') ||
            (posPaymentMethod || '').toLowerCase().includes('deni')
          )) ||
          posLoanDueDate ||
          posLoanNationalId ||
          posLoanGuarantorName ||
          (posLoanDownPayment > 0 && posTotal > posLoanDownPayment)
        )}
        loanDownPayment={posLoanDownPayment}
        isDark={isDark}
        getPosItemUnitPrice={getPosItemUnitPrice}
      />

      {/* Global Keyboard Shortcut Cheat Sheet Modal */}

      <AdminShortcutCheatSheetModal

        isOpen={isShortcutsModalOpen}

        onClose={() => setIsShortcutsModalOpen(false)}

        isDark={isDark}

      />



      {/* Global Command Palette & Navigation Jump */}

      <AdminCommandPalette

        isOpen={isCommandPaletteOpen}

        onClose={() => setIsCommandPaletteOpen(false)}

        isDark={isDark}

        products={products}

        orders={orders}

        posTransactions={posTransactions}

        onNavigateTab={(tab) => {

          setActiveTab(tab as any);

          setIsCommandPaletteOpen(false);

          triggerShortcutFeedback(`Switched to ${tab.charAt(0).toUpperCase() + tab.slice(1)}`, '');

        }}

        onOpenAddProduct={() => {

          handleOpenAddModal();

          triggerShortcutFeedback('Opened Add Genuine Product Form', `${isMac ? '⌘' : 'Ctrl'}+N`);

        }}

        onSaveSettings={triggerSaveFromShortcut}

        onOpenScanner={() => {

          setIsScannerOpen(true);

          triggerShortcutFeedback('Opened Barcode & QR Scanner', `${isMac ? '⌘' : 'Ctrl'}+B`);

        }}

        onOpenPrintAllQr={() => {

          setIsBulkQrModalOpen(true);

        }}

        onToggleTheme={() => {

          if (onToggleTheme) {

            onToggleTheme();

            triggerShortcutFeedback('Toggled Theme Mode', `${isMac ? '⌘' : 'Ctrl'}+Shift+L`);

          }

        }}

        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}

      />

      {/* POS Z-Report End-of-Day Balancing Modal */}
      {isZReportOpen && (
        <POSZReportModal
          transactions={posTransactions}
          storeSettings={storeSettings}
          cashierName={user?.name || profile?.name || 'Authorized Cashier'}
          onClose={() => setIsZReportOpen(false)}
        />
      )}

      {/* POS Serial / IMEI Tracking Modal */}
      {activeSerialInputItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]`}>
            <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-500 flex items-center justify-center">
                  <Hash className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm truncate max-w-[220px]">{activeSerialInputItem.productName}</h3>
                  <p className="text-[11px] text-slate-400">Qty: {activeSerialInputItem.quantity} unit(s) · Serial Number / IMEI</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSerialInputItem(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className={`p-3 rounded-2xl border text-xs ${isDark ? 'bg-slate-800/40 border-slate-800 text-slate-300' : 'bg-blue-50/60 border-blue-200 text-blue-900'}`}>
                <p className="leading-relaxed font-medium">
                  Enter device Serial Number(s) or IMEI codes for warranty registration and thermal receipt printing.
                </p>
              </div>

              <div className="space-y-2.5">
                {Array.from({ length: activeSerialInputItem.quantity }).map((_, idx) => (
                  <div key={idx} className="space-y-1">
                    <label className="block text-[11px] font-bold opacity-75">
                      Unit #{idx + 1} Serial / IMEI Number
                    </label>
                    <input
                      type="text"
                      placeholder={`e.g. SN-${activeSerialInputItem.productId.slice(0, 4).toUpperCase()}-${1000 + idx}`}
                      defaultValue={activeSerialInputItem.currentSerials[idx] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setActiveSerialInputItem(prev => {
                          if (!prev) return null;
                          const nextSerials = [...prev.currentSerials];
                          nextSerials[idx] = val;
                          return { ...prev, currentSerials: nextSerials };
                        });
                      }}
                      className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono font-bold outline-none focus:border-blue-500 ${inputBg}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-4 border-t flex items-center justify-between gap-3 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-100 bg-slate-50'}`}>
              <button
                type="button"
                onClick={() => {
                  if (activeSerialInputItem) {
                    setPosCart(prev =>
                      prev.map(item =>
                        item.product.id === activeSerialInputItem.productId
                          ? { ...item, serialNumbers: [] }
                          : item
                      )
                    );
                  }
                  setActiveSerialInputItem(null);
                }}
                className="text-xs text-rose-500 font-bold hover:underline cursor-pointer"
              >
                Clear Serials
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSerialInputItem(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeSerialInputItem) {
                      const cleaned = activeSerialInputItem.currentSerials
                        .map(s => s?.trim())
                        .filter(Boolean);
                      setPosCart(prev =>
                        prev.map(item =>
                          item.product.id === activeSerialInputItem.productId
                            ? { ...item, serialNumbers: cleaned }
                            : item
                        )
                      );
                      triggerHaptic('success');
                    }
                    setActiveSerialInputItem(null);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 cursor-pointer"
                >
                  Save Serial Numbers
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>

  );

};

