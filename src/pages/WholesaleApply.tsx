import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, CheckCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useWholesaleFormFields, useSubmitWholesaleApplication } from "@/hooks/useWholesale";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const SECTION_BREAKS: Record<number, { title: string; description?: string }> = {
  1: { title: "About your Madrasah/Maktab/Institute", description: "Tell us about your institution" },
  11: { title: "About You", description: "Your personal details" },
};

const WholesaleApply = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: fields, isLoading } = useWholesaleFormFields();
  const submitApp = useSubmitWholesaleApplication();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const sortedFields = useMemo(() => fields?.slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [fields]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 max-w-lg mx-auto px-6 text-center space-y-4">
          <Building2 className="h-12 w-12 text-primary mx-auto" />
          <h1 className="font-serif text-2xl text-foreground">Discount Registration Form</h1>
          <p className="text-muted-foreground">for Madrasah / Maktab / Institute</p>
          <p className="text-muted-foreground text-sm">Please log in or create an account first to apply for wholesale pricing.</p>
          <Button onClick={() => navigate("/auth")} className="gap-2">Log In / Sign Up</Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 max-w-lg mx-auto px-6 text-center space-y-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
          </motion.div>
          <h1 className="font-serif text-2xl text-foreground">Application Submitted!</h1>
          <p className="text-muted-foreground">Your wholesale application is under review. We'll notify you once it's been processed.</p>
          <Button onClick={() => navigate("/")} variant="outline">Back to Home</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = sortedFields?.filter(f => f.required && !formData[f.id]?.trim());
    if (missing && missing.length > 0) {
      toast.error(`Please fill in: ${missing.map(f => f.label).join(", ")}`);
      return;
    }

    // Validate email confirmation
    const emailField = sortedFields?.find(f => f.label === "Your Email Address");
    const reEmailField = sortedFields?.find(f => f.label === "Re-Enter Email Address");
    if (emailField && reEmailField && formData[emailField.id] !== formData[reEmailField.id]) {
      toast.error("Email addresses do not match");
      return;
    }

    // Validate password confirmation
    const passField = sortedFields?.find(f => f.label === "Password");
    const rePassField = sortedFields?.find(f => f.label === "Re-Enter Password");
    if (passField && rePassField && formData[passField.id] !== formData[rePassField.id]) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      await submitApp.mutateAsync({ user_id: user.id, form_data: formData });
      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (e: any) {
      toast.error(e.message || "Failed to submit application");
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.id] || "";
    const onChange = (val: string) => setFormData(prev => ({ ...prev, [field.id]: val }));
    const isPassword = field.label?.toLowerCase().includes("password");

    switch (field.field_type) {
      case "textarea":
        return <Textarea placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} className="text-sm" rows={3} />;
      case "dropdown": {
        const options = (field.options as string[]) || [];
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="text-sm"><SelectValue placeholder={field.placeholder || "Select..."} /></SelectTrigger>
            <SelectContent>
              {options.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      }
      case "number":
        return <Input type="number" placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} className="text-sm" />;
      case "email":
        return <Input type="email" placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} className="text-sm" />;
      case "phone":
        return <Input type="tel" placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} className="text-sm" />;
      default:
        return <Input type={isPassword ? "password" : "text"} placeholder={field.placeholder} value={value} onChange={e => onChange(e.target.value)} className="text-sm" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-8">
            <Building2 className="h-10 w-10 text-primary mx-auto mb-3" />
            <h1 className="font-serif text-3xl text-foreground">Wholesale Form</h1>
            <p className="text-muted-foreground mt-2">Discount registration form for Madrasah / Maktab / Institute</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">Registration Form</CardTitle>
              <CardDescription>Fill in the details below to apply for discounted pricing.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {sortedFields?.map(field => {
                  const sortOrder = field.sort_order ?? 0;
                  const section = SECTION_BREAKS[sortOrder];
                  return (
                    <div key={field.id}>
                      {section && (
                        <div className="pt-4 pb-2 mb-3 border-b border-border">
                          <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                          {section.description && <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>}
                        </div>
                      )}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {renderField(field)}
                      </div>
                    </div>
                  );
                })}
                <Button type="submit" disabled={submitApp.isPending} className="w-full gap-2 mt-6">
                  <Send className="h-4 w-4" />
                  {submitApp.isPending ? "Submitting..." : "SUBMIT"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default WholesaleApply;
