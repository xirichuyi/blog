// Material Web Components Imports - Complete Official Component Set
// Import all available Material Web Components

// Buttons - All Official Variants
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/button/elevated-button.js';
import '@material/web/button/filled-tonal-button.js';

// Cards (from labs directory)
import '@material/web/labs/card/elevated-card.js';
import '@material/web/labs/card/outlined-card.js';
import '@material/web/labs/card/filled-card.js';

// Chips - All Variants
import '@material/web/chips/chip-set.js';
import '@material/web/chips/assist-chip.js';
import '@material/web/chips/filter-chip.js';
import '@material/web/chips/input-chip.js';
import '@material/web/chips/suggestion-chip.js';

// Icons
import '@material/web/icon/icon.js';

// Icon Buttons - All Variants
import '@material/web/iconbutton/icon-button.js';
import '@material/web/iconbutton/filled-icon-button.js';
import '@material/web/iconbutton/outlined-icon-button.js';
import '@material/web/iconbutton/filled-tonal-icon-button.js';

// Text Fields - All Variants
import '@material/web/textfield/filled-text-field.js';
import '@material/web/textfield/outlined-text-field.js';

// Form Controls
import '@material/web/checkbox/checkbox.js';
import '@material/web/radio/radio.js';
import '@material/web/switch/switch.js';
import '@material/web/slider/slider.js';

// Select
import '@material/web/select/filled-select.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';

// Navigation
import '@material/web/tabs/tabs.js';
import '@material/web/tabs/primary-tab.js';
import '@material/web/tabs/secondary-tab.js';

// Progress Indicators
import '@material/web/progress/linear-progress.js';
import '@material/web/progress/circular-progress.js';

// Layout Components
import '@material/web/divider/divider.js';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';

// Menu System
import '@material/web/menu/menu.js';
import '@material/web/menu/menu-item.js';
import '@material/web/menu/sub-menu.js';

// Dialog
import '@material/web/dialog/dialog.js';

// FAB (Floating Action Button)
import '@material/web/fab/fab.js';
import '@material/web/fab/branded-fab.js';

// Labs Components (Experimental)
import '@material/web/labs/badge/badge.js';
import '@material/web/labs/item/item.js';
import '@material/web/labs/navigationbar/navigation-bar.js';
import '@material/web/labs/navigationtab/navigation-tab.js';
import '@material/web/labs/navigationdrawer/navigation-drawer.js';
import '@material/web/labs/navigationdrawer/navigation-drawer-modal.js';
import '@material/web/labs/segmentedbutton/outlined-segmented-button.js';
import '@material/web/labs/segmentedbuttonset/outlined-segmented-button-set.js';

// Typography styles
import { styles as typescaleStyles } from '@material/web/typography/md-typescale-styles.js';

// Apply typography styles globally
document.adoptedStyleSheets.push(typescaleStyles.styleSheet);

// TypeScript declarations for Material Web Components
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Buttons
      'md-filled-button': any;
      'md-outlined-button': any;
      'md-text-button': any;
      'md-elevated-button': any;
      'md-filled-tonal-button': any;

      // Cards
      'md-outlined-card': any;
      'md-elevated-card': any;
      'md-filled-card': any;

      // Chips
      'md-chip-set': any;
      'md-assist-chip': any;
      'md-filter-chip': any;
      'md-input-chip': any;
      'md-suggestion-chip': any;

      // Icons and Icon Buttons
      'md-icon': any;
      'md-icon-button': any;
      'md-filled-icon-button': any;
      'md-outlined-icon-button': any;
      'md-filled-tonal-icon-button': any;

      // Text Fields
      'md-filled-text-field': any;
      'md-outlined-text-field': any;

      // Form Controls
      'md-checkbox': any;
      'md-radio': any;
      'md-switch': any;
      'md-slider': any;

      // Select
      'md-filled-select': any;
      'md-outlined-select': any;
      'md-select-option': any;

      // Navigation
      'md-tabs': any;
      'md-primary-tab': any;
      'md-secondary-tab': any;

      // Progress
      'md-linear-progress': any;
      'md-circular-progress': any;

      // Layout
      'md-divider': any;
      'md-list': any;
      'md-list-item': any;

      // Menu
      'md-menu': any;
      'md-menu-item': any;
      'md-sub-menu': any;

      // Dialog
      'md-dialog': any;

      // FAB
      'md-fab': any;
      'md-branded-fab': any;

      // Labs Components
      'md-badge': any;
      'md-item': any;
      'md-navigation-bar': any;
      'md-navigation-tab': any;
      'md-navigation-drawer': any;
      'md-navigation-drawer-modal': any;
      'md-outlined-segmented-button': any;
      'md-outlined-segmented-button-set': any;
    }
  }
}
