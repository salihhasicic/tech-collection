import './GlowButton.css'

export default function GlowButton({ children, as: Tag = 'button', className = '', ...props }) {
  return (
    <Tag className={`glow-btn ${className}`} {...props}>
      <span className="glow-btn__shimmer" />
      <span>{children}</span>
    </Tag>
  )
}
