// The geometric Auctum mark (paths from visinv/public/auctum.svg). Colour follows `color` via currentColor.
// `decorative` hides it from screen readers where visible text already names the app.
export default function AuctumMark({ size = 24, className, decorative = false }) {
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': 'Auctum' };
  return (
    <svg viewBox="202 274 848 708" width={size} height={(size * 708) / 848} className={className} {...a11y}>
      <g fill="currentColor" fillRule="evenodd">
        <path d="M 492 502 L 444 580 L 412 635 L 397 658 L 314 798 L 299 821 L 297 826 L 203 981 L 518 981 L 663 811 L 478 812 L 476 810 L 577 646 Z" />
        <path d="M 627 275 L 574 364 L 533 430 L 533 432 L 622 581 L 646 624 L 717 743 L 761 820 L 800 884 L 813 908 L 851 971 L 856 981 L 1049 981 L 992 885 L 988 880 L 983 870 L 950 817 L 945 807 L 938 797 L 889 713 L 874 690 L 869 680 L 820 600 L 799 563 L 777 528 L 775 523 Z" />
      </g>
    </svg>
  );
}
