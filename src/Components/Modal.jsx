import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * The centred overlay behind the two ⓘ panels — the scoring scale on House, the FGC rules on PlayerProfile.
 *
 * ⚠ It renders into `document.body`, not next to the button that opened it. `.ModalOverlay` is `position: fixed`, and
 * a fixed child of a transformed ancestor is positioned against that ancestor instead of the viewport — the pages have
 * animations that would make the panel land somewhere off screen. The portal puts it out of reach of all of them.
 *
 * The panel used to be `position: absolute; top: 20%`, i.e. 20% down the *document*: opened from a ranking read at the
 * bottom of a long page, it appeared far above the fold and looked like nothing had happened.
 *
 * Styling lives in Common.css with `.Tooltip`, which this keeps as the panel's class — House.css hangs overrides off
 * it, and the pages' tests find the panel through the close button's parent.
 */
export default function Modal({label, onClose, children}) {
    useEffect(() => {
        const closeOnEscape = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [onClose]);

    return createPortal(
        // The backdrop closes; the panel swallows the click so that selecting text inside it does not.
        <div className={'ModalOverlay'} onClick={onClose}>
            <div className={'Tooltip'} role={'dialog'} aria-modal={'true'} aria-label={label}
                 onClick={(event) => event.stopPropagation()}>
                <button className={'CallToAction'} onClick={onClose}>
                    <span className={'ReaderOnly'}>Fermer</span>
                </button>
                {children}
            </div>
        </div>,
        document.body,
    );
}
