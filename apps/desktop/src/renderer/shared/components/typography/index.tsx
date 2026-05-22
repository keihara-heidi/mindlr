import * as React from 'react';
import { cn } from '@shared/lib/utils';

type HeadingProps = React.HTMLAttributes<HTMLHeadingElement>;
type ParagraphProps = React.HTMLAttributes<HTMLParagraphElement>;
type QuoteProps = React.BlockquoteHTMLAttributes<HTMLQuoteElement>;
type ListProps = React.HTMLAttributes<HTMLUListElement>;
type SpanProps = React.HTMLAttributes<HTMLSpanElement>;
type CodeProps = React.HTMLAttributes<HTMLElement>;

export function TypographyH1({ className, ...props }: HeadingProps) {
  return (
    <h1
      className={cn('scroll-m-20 text-4xl font-extrabold tracking-tight text-balance lg:text-5xl', className)}
      {...props}
    />
  );
}

export function TypographyH2({ className, ...props }: HeadingProps) {
  return (
    <h2
      className={cn(
        'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
        className,
      )}
      {...props}
    />
  );
}

export function TypographyH3({ className, ...props }: HeadingProps) {
  return (
    <h3
      className={cn('scroll-m-20 text-2xl font-semibold tracking-tight', className)}
      {...props}
    />
  );
}

export function TypographyH4({ className, ...props }: HeadingProps) {
  return (
    <h4
      className={cn('scroll-m-20 text-xl font-semibold tracking-tight', className)}
      {...props}
    />
  );
}

export function TypographyP({ className, ...props }: ParagraphProps) {
  return (
    <p className={cn('leading-7 [&:not(:first-child)]:mt-6', className)} {...props} />
  );
}

export function TypographyLead({ className, ...props }: ParagraphProps) {
  return <p className={cn('text-muted-foreground text-xl', className)} {...props} />;
}

export function TypographyLarge({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('text-lg font-semibold', className)} {...props} />;
}

export function TypographySmall({ className, ...props }: SpanProps) {
  return <small className={cn('text-sm leading-none font-medium', className)} {...props} />;
}

export function TypographyMuted({ className, ...props }: ParagraphProps) {
  return <p className={cn('text-muted-foreground text-sm', className)} {...props} />;
}

export function TypographyBlockquote({ className, ...props }: QuoteProps) {
  return <blockquote className={cn('mt-6 border-l-2 pl-6 italic', className)} {...props} />;
}

export function TypographyInlineCode({ className, ...props }: CodeProps) {
  return (
    <code
      className={cn(
        'bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
        className,
      )}
      {...props}
    />
  );
}

export function TypographyList({ className, ...props }: ListProps) {
  return <ul className={cn('my-6 ml-6 list-disc [&>li]:mt-2', className)} {...props} />;
}
