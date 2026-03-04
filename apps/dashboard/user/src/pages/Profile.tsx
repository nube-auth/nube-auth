import React, { useState } from "react";
import { useMe } from "../hooks/api";
import {
	Icon,
	IconType,
	Card,
	CardHeader,
	CardTitle,
	CardBody,
	Button,
	Field,
	Label,
	Input,
	Alert,
	Chip,
  Spinner,
} from "@proofa/components";
// Proofa composites
import { ProfileHeader, InfoGrid } from "@proofa/components";
import { TabNavigation } from "../components/TabNavigation";
import { PageLoader } from "../components/PageLoader";

export function ProfilePage() {
	const { user, isLoading, update, isUpdating, updateError } = useMe();
	const [name, setName] = useState("");
	const [isSaving, setIsSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);

	const formatDate = (date: string | number) => {
		const timestamp = typeof date === "number" ? date * 1000 : new Date(date).getTime();
		return new Date(timestamp).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

  React.useEffect(() => {
    if (user) {
      setName(user.name || "");
    }
  }, [user]);

  if (isLoading) {
    return <PageLoader message="Loading profile..." />;
  }

  if (!user) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center justify-center py-12 text-center">
          <Icon icon={IconType.Alert} size={28} bold className="text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">User not found</h3>
          <p className="text-sm text-muted">Unable to load your profile information.</p>
        </CardBody>
      </Card>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update(
      { name },
      {
        onSuccess: () => {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        },
      },
    );
  };

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.charAt(0).toUpperCase() || "U";


  return (
    <div className="space-y-6">
      {/* Profile Header (composite) */}
      <ProfileHeader
        name={user.name || "User"}
        email={user.email}
        meta="Last updated recently"
        avatar={<div className="size-16 rounded-full bg-primary text-white grid place-items-center font-semibold ring-2 ring-card-border/80 shadow-sm">{initials}</div>}
      />

      {/* Info Grid (composite) */}
      <Card>
        <CardBody>
          <InfoGrid
            items={[
              { label: "Email", value: user.email },
              { label: "Status", value: (<span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" /> Active</span>) },
              { label: "Account Type", value: (<span className="inline-flex items-center gap-2"><Icon icon={IconType.User} size={16} /> User</span>) },
              { label: "Joined", value: formatDate(user.createdAt) },
            ]}
            columns={4}
          />
        </CardBody>
      </Card>

      {/* Tab Navigation */}
      <TabNavigation />

      {/* Success Alert */}
      {showSuccess && (
        <Alert variant="success" className="items-center gap-2">
          <Icon icon={IconType.CheckCircle} size={20} bold className="shrink-0" />
          <span>Profile updated successfully!</span>
        </Alert>
      )}

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Field>
              <Label>Email Address</Label>
              <div className="flex items-center gap-2">
                <Input type="email" value={user.email} disabled className="flex-1" />
                <Chip variant="success" size="sm" pill>Verified</Chip>
              </div>
              <p className="text-sm text-muted mt-1">Email cannot be changed</p>
            </Field>

            <Field>
              <Label htmlFor="name">Display Name</Label>
              <Input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
              <p className="text-sm text-muted mt-1">This name will be displayed across all apps</p>
            </Field>

            <div className="flex justify-between items-center">
              <Button type="submit" disabled={isUpdating} variant="primary">
                {isUpdating ? (
                  <>
                    <Spinner />
                    Saving...
                  </>
                ) : (
                  <>
                    <Icon icon={IconType.Check} size={18} bold />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col divide-y divide-border">
            <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Account Identifier</span>
                <span className="text-sm text-muted">Your unique reference</span>
              </div>
              <code className="text-sm bg-accent px-2 py-1 rounded">{user.email}</code>
            </div>
            <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Account Created</span>
                <span className="text-sm text-muted">When you first signed up</span>
              </div>
              <span className="text-sm">{formatDate(user.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">Authentication</span>
                <span className="text-sm text-muted">Sign-in method</span>
              </div>
              <Chip variant="default" size="sm">
                <Icon icon={IconType.Google} size={12} />
                Google
              </Chip>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}