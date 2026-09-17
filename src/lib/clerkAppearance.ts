export function getPersonyClerkAppearance(theme: 'dark' | 'light') {
  const isDark = theme === 'dark';

  return {
    variables: {
      colorPrimary: isDark ? '#4ec9a0' : '#3db892',
      colorDanger: '#f87171',
      colorSuccess: '#22c55e',
      colorWarning: '#fbbf24',
      colorNeutral: isDark ? '#71717a' : '#a1a1aa',
      colorBackground: isDark ? '#1a1a1d' : '#ffffff',
      colorInputBackground: isDark ? '#1c1c1f' : '#f4f4f5',
      colorInputText: isDark ? '#f4f4f5' : '#18181b',
      colorText: isDark ? '#f4f4f5' : '#18181b',
      colorTextSecondary: isDark ? '#a1a1aa' : '#52525b',
      colorTextOnPrimaryBackground: isDark ? '#0a0a0b' : '#ffffff',
      borderRadius: '0.75rem',
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      fontFamilyButtons: "'Plus Jakarta Sans', system-ui, sans-serif",
    },
    layout: {
      logoImageUrl: isDark ? '/brand/persony-icon-light.svg' : '/brand/persony-icon-dark.svg',
      logoPlacement: 'inside',
      socialButtonsVariant: 'iconButton',
      showOptionalFields: false,
    },
    elements: {
      rootBox: 'font-sans',
      card: isDark
        ? 'bg-[#1a1a1d] border border-[#27272a] shadow-2xl rounded-2xl overflow-hidden'
        : 'bg-white border border-[#e4e4e7] shadow-xl rounded-2xl overflow-hidden',
      cardBox: 'rounded-2xl overflow-hidden shadow-2xl',
      headerTitle: isDark ? 'text-[#f4f4f5] font-semibold' : 'text-[#18181b] font-semibold',
      headerSubtitle: isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]',
      formButtonPrimary:
        'bg-py-accent hover:opacity-90 text-[#0a0a0b] font-medium normal-case shadow-none',
      formFieldInput: isDark
        ? 'bg-[#1c1c1f] border-[#27272a] text-[#f4f4f5]'
        : 'bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]',
      footer: 'hidden',
      footerAction: 'hidden',
      footerActionLink: 'hidden',
      footerActionText: 'hidden',
      identityPreviewEditButton: 'text-py-accent',
      navbar: isDark ? 'bg-[#111113] border-[#27272a]' : 'bg-[#fafafa] border-[#e4e4e7]',
      navbarButton: isDark ? 'text-[#a1a1aa] hover:text-[#f4f4f5]' : 'text-[#52525b] hover:text-[#18181b]',
      pageScrollBox: isDark ? 'bg-[#1a1a1d]' : 'bg-white',
      profileSectionPrimaryButton: 'text-py-accent',
      userButtonPopoverCard: isDark
        ? 'bg-[#1a1a1d] border border-[#27272a] shadow-xl'
        : 'bg-white border border-[#e4e4e7] shadow-lg',
      userButtonPopoverFooter: 'hidden',
      userPreviewMainIdentifier: isDark ? 'text-[#f4f4f5]' : 'text-[#18181b]',
      userPreviewSecondaryIdentifier: isDark ? 'text-[#a1a1aa]' : 'text-[#52525b]',
      menuButton: isDark ? 'text-[#f4f4f5] hover:bg-white/5' : 'text-[#18181b] hover:bg-black/5',
      menuList: isDark ? 'border border-[#27272a]' : 'border border-[#e4e4e7]',
      modalBackdrop: 'bg-black/70 backdrop-blur-sm',
      modalContent: isDark
        ? 'bg-[#1a1a1d] rounded-2xl overflow-hidden border border-[#27272a]'
        : 'bg-white rounded-2xl overflow-hidden border border-[#e4e4e7]',
      scrollBox: 'rounded-2xl overflow-hidden',
      userProfile: 'rounded-2xl overflow-hidden',
    },
  };
}

export const personyClerkLocalization = {
  signIn: {
    start: {
      title: 'Вход в Persony',
      subtitle: 'Продолжите общение с персонажами',
    },
  },
  signUp: {
    start: {
      title: 'Регистрация в Persony',
      subtitle: 'Создайте аккаунт за минуту',
    },
  },
  userProfile: {
    navbar: {
      account: 'Профиль',
      security: 'Безопасность',
    },
    start: {
      headerTitle__account: 'Аккаунт',
      headerSubtitle__account: 'Профиль и почта',
    },
  },
} as const;
