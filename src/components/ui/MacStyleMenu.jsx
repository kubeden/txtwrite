'use client';

import { useState, useRef, useEffect } from 'react';
import { FaChevronRight } from 'react-icons/fa';

/**
 * A Mac-style dropdown menu component
 * @param {Object} props
 * @param {Object[]} props.items - Array of menu items to display
 * @param {string} props.items[].label - Text to display for the menu item
 * @param {Function} props.items[].onClick - Function to call when item is clicked (for action items)
 * @param {Object[]} props.items[].submenu - Array of submenu items (for nested menus)
 * @param {string} props.items[].shortcut - Optional keyboard shortcut to display (e.g., "⌘+S")
 * @param {boolean} props.items[].divider - If true, displays a divider line after this item
 * @param {boolean} props.isOpen - Whether the menu is currently open
 * @param {Function} props.onClose - Function to call when the menu should close
 * @param {string} props.position - Position of the menu ("top-left", "top-right", etc.)
 * @param {Object} props.parentRect - Optional bounding client rect of parent menu item (for submenus)
 */
const MacStyleMenu = ({
    items,
    isOpen,
    onClose,
    position = 'top-left',
    parentRect = null
}) => {
    const [activeSubmenu, setActiveSubmenu] = useState(null);
    const [submenuRects, setSubmenuRects] = useState({});
    const menuRef = useRef(null);
    const menuItemRefs = useRef([]);

    // Calculate position styles based on the position prop
    const getPositionStyles = () => {
        switch (position) {
            case 'top-left':
                return { top: '100%', left: '0' };
            case 'top-right':
                return { top: '100%', right: '0' };
            case 'bottom-left':
                return { bottom: '100%', left: '0' };
            case 'bottom-right':
                return { bottom: '100%', right: '0' };
            case 'right-aligned':
                return { top: '0', left: '100%', marginLeft: '2px' };
            default:
                return { top: '100%', left: '0' };
        }
    };

    // Handle clicking outside the menu to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Close menu on ESC key press
    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [isOpen, onClose]);

    // Calculate submenu position and store bounding rects
    useEffect(() => {
        if (isOpen && menuItemRefs.current.length) {
            const newRects = {};
            menuItemRefs.current.forEach((ref, index) => {
                if (ref) {
                    newRects[index] = ref.getBoundingClientRect();
                }
            });
            setSubmenuRects(newRects);
        }
    }, [isOpen, items]);

    // Handle menu item click
    const handleItemClick = (item) => {
        if (item.onClick && !item.submenu) {
            item.onClick();
            onClose();
        }
    };

    // Handle hovering over an item with a submenu
    const handleItemHover = (index) => {
        const item = items[index];
        if (item && item.submenu) {
            setActiveSubmenu(index);
        } else {
            setActiveSubmenu(null);
        }
    };

    // Helper function to check if submenu would go off screen
    const getSubmenuPosition = (index) => {
        const rect = submenuRects[index];

        if (!rect) {
            return {
                top: menuItemRefs.current[index]?.offsetTop || 0,
                left: '100%',
                marginLeft: '2px'
            };
        }

        // Get menu's offset from the parent
        const menuRect = menuRef.current?.getBoundingClientRect();

        // Calculate available space on right of the menu
        const viewportWidth = globalThis.innerWidth;
        const estimatedSubmenuWidth = 200; // Approximate width of submenu
        const rightSpace = viewportWidth - (menuRect?.right || 0);

        // If not enough space on right, position submenu to the left
        const position = {};
        position.top = menuItemRefs.current[index]?.offsetTop || 0;

        if (rightSpace < estimatedSubmenuWidth) {
            position.right = '100%';
            position.marginRight = '2px';
            position.left = 'auto';
        } else {
            position.left = '100%';
            position.marginLeft = '2px';
            position.right = 'auto';
        }

        return position;
    };

    if (!isOpen) return null;

    return (
        <div
            ref={menuRef}
            className="absolute z-50"
            style={getPositionStyles()}
        >
            <div className="min-w-48 py-1 bg-neutral-800 border border-neutral-700 rounded-md shadow-lg overflow-hidden">
                {items.map((item, index) => (
                    <div key={`menu-item-${index}`}>
                        {/* Menu Item */}
                        <div
                            ref={el => menuItemRefs.current[index] = el}
                            className={`px-4 py-1.5 flex items-center justify-between text-sm ${item.disabled ? 'text-neutral-500 cursor-not-allowed' : 'text-neutral-200 hover:bg-neutral-700 cursor-pointer'
                                }`}
                            onClick={() => !item.disabled && handleItemClick(item)}
                            onMouseEnter={() => handleItemHover(index)}
                            aria-disabled={item.disabled}
                        >
                            <div className="flex items-center">
                                {item.icon && <span className="mr-2">{item.icon}</span>}
                                <span>{item.label}</span>
                            </div>
                            <div className="flex items-center">
                                {item.shortcut && <span className="text-xs text-neutral-500 ml-6">{item.shortcut}</span>}
                                {item.submenu && <FaChevronRight className="ml-2 text-xs text-neutral-500" />}
                            </div>
                        </div>

                        {/* Submenu - with smart positioning */}
                        {item.submenu && activeSubmenu === index && (
                            <div
                                className="absolute"
                                style={getSubmenuPosition(index)}
                            >
                                <MacStyleMenu
                                    items={item.submenu}
                                    isOpen
                                    onClose={onClose}
                                    position="right-aligned"
                                    parentRect={submenuRects[index]}
                                />
                            </div>
                        )}

                        {/* Divider */}
                        {item.divider && <hr className="my-1 border-neutral-700" />}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MacStyleMenu;