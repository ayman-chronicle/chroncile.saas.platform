"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type FieldErrors = {
  name?: string[];
  email?: string[];
  password?: string[];
  organizationName?: string[];
};

export default function SignupPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    organizationName: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          setErrors(data.details);
        } else {
          setGeneralError(data.error || "Registration failed");
        }
        setLoading(false);
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setGeneralError("Connection error");
      setLoading(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    `w-full px-0 py-3 bg-transparent border-0 border-b text-base text-primary placeholder:text-tertiary/30 focus:outline-none transition-colors ${
      hasError ? "border-critical" : "border-border-dim focus:border-data"
    }`;

  return (
    <div className="space-y-10">
      {/* Mobile Logo */}
      <div className="lg:hidden flex items-center gap-3 mb-8">
        <div className="w-8 h-8 bg-data" />
        <span className="text-base font-medium text-primary/90">
          Agent Warmup
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-light text-primary mb-2">
          Create account
        </h1>
        <p className="text-sm text-tertiary/60">
          Get started in minutes
        </p>
      </div>

      {/* Error */}
      {generalError && (
        <p className="text-sm text-critical">{generalError}</p>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-xs text-tertiary/60 mb-2">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="name"
              className={inputClass(!!errors.name)}
              placeholder="Your name"
            />
            {errors.name && (
              <p className="mt-2 text-xs text-critical">{errors.name[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-xs text-tertiary/60 mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              className={inputClass(!!errors.email)}
              placeholder="you@company.com"
            />
            {errors.email && (
              <p className="mt-2 text-xs text-critical">{errors.email[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-xs text-tertiary/60 mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
              className={inputClass(!!errors.password)}
              placeholder="••••••••"
            />
            {errors.password ? (
              <p className="mt-2 text-xs text-critical">{errors.password[0]}</p>
            ) : (
              <p className="mt-2 text-xs text-tertiary/40">
                8+ chars, mixed case, number
              </p>
            )}
          </div>

          <div>
            <label htmlFor="organizationName" className="block text-xs text-tertiary/60 mb-2">
              Organization
            </label>
            <input
              id="organizationName"
              name="organizationName"
              type="text"
              value={formData.organizationName}
              onChange={handleChange}
              required
              className={inputClass(!!errors.organizationName)}
              placeholder="Company name"
            />
            {errors.organizationName && (
              <p className="mt-2 text-xs text-critical">{errors.organizationName[0]}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-data text-[#07090c] py-3.5 text-sm font-medium hover:bg-data/90 transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "Continue"}
        </button>
      </form>

      {/* Footer */}
      <p className="text-sm text-tertiary/50">
        Have an account?{" "}
        <Link href="/login" className="text-primary hover:text-data transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  );
}
